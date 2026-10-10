// Lifecycle ของแถว log_import_file — SQL ทุกคำสั่งที่แตะตารางนี้ใน webapp
// ต้องผ่านโมดูลนี้ (Next routes, importer daemon, worker child ใช้ร่วมกัน จึงเป็น
// CommonJS และไม่ผูก driver: ทุกฟังก์ชันรับ connection ของ mysql2 เข้ามา)
//
// pending → processing → complete | not_complate
//    ↑___________ requeue ___________|  (เฉพาะ interrupted/transient)
//
// transform/run_transform.js มี isImporting ของตัวเอง (คนละ image ไม่ mount
// webapp/lib) — ถ้าเปลี่ยน ACTIVE_STATUSES ต้องแก้ที่นั่นด้วย

const STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETE: "complete",
  // สะกดผิดแต่เป็นค่าจริงใน DB — ห้ามแก้โดยไม่มี migration
  FAILED: "not_complate",
  // ค่าเก่าจากรุ่นก่อน ยังมีแถวค้างอยู่ — อ่านอย่างเดียว ไม่เขียนใหม่
  FAILED_LEGACY: "no_complete",
});

const ACTIVE_STATUSES = Object.freeze([STATUS.PENDING, STATUS.PROCESSING]);
const FAILED_STATUSES = Object.freeze([STATUS.FAILED, STATUS.FAILED_LEGACY]);
const STATUSES_BY_TAB = Object.freeze({
  success: [STATUS.COMPLETE],
  failed: FAILED_STATUSES,
  pending: ACTIVE_STATUSES,
});

const placeholders = (values) => values.map(() => "?").join(", ");

function isFailedStatus(status) {
  return FAILED_STATUSES.includes(status);
}

async function createPending(conn, fileName, fileSize = null) {
  const [result] = await conn.execute(
    "INSERT INTO `log_import_file` (`file_name`, `file_size`, `status`) VALUES (?, ?, ?)",
    [fileName, fileSize, STATUS.PENDING]
  );
  return result.insertId;
}

async function getFileName(conn, id) {
  const [rows] = await conn.execute("SELECT `file_name` FROM `log_import_file` WHERE `id` = ?", [id]);
  return rows[0]?.file_name ?? null;
}

async function markProcessing(conn, id) {
  await conn.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?, \`finish_date_time\` = NULL, \`not_complete_msg\` = NULL
     WHERE \`id\` = ?`,
    [STATUS.PROCESSING, id]
  );
}

async function setProgress(conn, id, percent) {
  await conn.execute("UPDATE `log_import_file` SET `progress_percent` = ? WHERE `id` = ?", [percent, id]);
}

// warning = แถวข้าม/ฟิลด์ถูกตัด — complete + not_complete_msg คือ "สำเร็จแบบมีเตือน"
async function markComplete(conn, id, warning = null) {
  await conn.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?, \`finish_date_time\` = CURRENT_TIMESTAMP, \`not_complete_msg\` = ?
     WHERE \`id\` = ?`,
    [STATUS.COMPLETE, warning, id]
  );
}

// guard: ไม่ทับแถวที่จบไปแล้ว — worker บันทึกข้อความละเอียดไว้ก่อน daemon
// ที่ตามมาปิดจ๊อบด้วยข้อความทั่วไปจึงไม่ลบของ worker. คืน true ถ้าเปลี่ยนจริง
async function markFailed(conn, id, message) {
  const [result] = await conn.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?, \`finish_date_time\` = CURRENT_TIMESTAMP, \`not_complete_msg\` = ?
     WHERE \`id\` = ?
       AND \`finish_date_time\` IS NULL
       AND \`status\` IN (${placeholders(ACTIVE_STATUSES)})`,
    [STATUS.FAILED, message, id, ...ACTIVE_STATUSES]
  );
  return result.affectedRows > 0;
}

// คืน ZIP เข้าคิวเพื่อ retry: import_date_time = NOW() ให้ stale sweep นับอายุ
// ใหม่จากรอบนี้ ไม่ใช่เวลา upload เดิม
async function requeue(conn, id) {
  await conn.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?,
         \`import_date_time\` = CURRENT_TIMESTAMP,
         \`finish_date_time\` = NULL,
         \`progress_percent\` = NULL,
         \`not_complete_msg\` = NULL
     WHERE \`id\` = ?`,
    [STATUS.PENDING, id]
  );
}

// เก็บแถวกำพร้า: ค้าง pending/processing โดยไม่มีไฟล์ในคิวและไม่มี worker ทำอยู่.
// เกณฑ์ชี้ขาดคือไฟล์หาย (keepIds = id ที่ยังมีไฟล์ใน queue/processing หรือ worker
// กำลังทำ) — เวลาเป็นแค่ minimum age กัน race ตอนไฟล์เพิ่งถูกสร้าง. ห้าม sweep
// ตามเวลาอย่างเดียว: batch ใหญ่รอคิวเกิน 2 ชม. เป็นเรื่องปกติ (อ.เมือง 2026-07-09)
async function sweepOrphans(conn, staleMinutes, keepIds) {
  const [rows] = await conn.execute(
    `SELECT \`id\` FROM \`log_import_file\`
     WHERE \`status\` IN (${placeholders(ACTIVE_STATUSES)})
       AND \`finish_date_time\` IS NULL
       AND \`import_date_time\` < NOW() - INTERVAL ? MINUTE`,
    [...ACTIVE_STATUSES, staleMinutes]
  );
  const orphanIds = rows.map((row) => Number(row.id)).filter((id) => !keepIds.has(id));
  if (!orphanIds.length) return 0;

  const [result] = await conn.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?,
         \`finish_date_time\` = CURRENT_TIMESTAMP,
         \`not_complete_msg\` = 'Import interrupted: no queue file found, recovered by cleanup'
     WHERE \`id\` IN (${placeholders(orphanIds)})
       AND \`status\` IN (${placeholders(ACTIVE_STATUSES)})`,
    [STATUS.FAILED, ...orphanIds, ...ACTIVE_STATUSES]
  );
  return result.affectedRows;
}

// ใช้ block หน้า/งานที่ query ตารางใหญ่ระหว่าง LOAD DATA (แย่ง disk I/O)
async function isImporting(conn) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS n FROM \`log_import_file\` WHERE \`status\` IN (${placeholders(ACTIVE_STATUSES)})`,
    [...ACTIVE_STATUSES]
  );
  return Number(rows[0].n) > 0;
}

async function deleteExpiredFailed(conn) {
  const [result] = await conn.execute(
    `DELETE FROM \`log_import_file\`
     WHERE \`status\` IN (${placeholders(FAILED_STATUSES)})
       AND \`import_date_time\` < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY)`,
    [...FAILED_STATUSES]
  );
  return result.affectedRows;
}

// หน้า log-import: กรอง tab/คำค้นที่ SQL, เรียง id ล่าสุดก่อน. counts นับทั้งตาราง
// (ไม่ผูกคำค้น). ใช้ query ไม่ใช่ execute เพราะ LIMIT ? ใน prepared statement
// ของ mysql2 พังบางเวอร์ชันของ server
async function listPage(conn, { tab, q = "", page = 1, pageSize = 20 }) {
  const statuses = STATUSES_BY_TAB[tab] || STATUSES_BY_TAB.success;
  const where = [`status IN (${placeholders(statuses)})`];
  const params = [...statuses];
  if (q) {
    where.push("(file_name LIKE ? OR CAST(id AS CHAR) LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [countRows] = await conn.query("SELECT status, COUNT(*) AS n FROM log_import_file GROUP BY status");
  const counts = { success: 0, failed: 0, pending: 0 };
  for (const row of countRows) {
    const tabName = Object.keys(STATUSES_BY_TAB).find((name) => STATUSES_BY_TAB[name].includes(row.status));
    if (tabName) counts[tabName] += Number(row.n);
  }

  const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM log_import_file ${whereSql}`, params);
  const [rows] = await conn.query(
    `SELECT id, file_name, file_size, import_date_time, status, finish_date_time, not_complete_msg, progress_percent
     FROM log_import_file
     ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { rows, total: Number(total), counts };
}

module.exports = {
  STATUS,
  ACTIVE_STATUSES,
  FAILED_STATUSES,
  STATUSES_BY_TAB,
  isFailedStatus,
  createPending,
  getFileName,
  markProcessing,
  setProgress,
  markComplete,
  markFailed,
  requeue,
  sweepOrphans,
  isImporting,
  deleteExpiredFailed,
  listPage,
};
