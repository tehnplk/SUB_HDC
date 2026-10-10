const { connectWithRetry } = require("./db");
const { buildAuthHeaders, resolveGetUrl } = require("./sync_config");

const GET_URL = resolveGetUrl("sql-command");
const DEFAULT_INTERVAL_MINUTES = 90;

async function fetchSqlPayload() {
  const response = await fetch(GET_URL, { headers: buildAuthHeaders() });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`fetch sync SQL failed ${response.status}: ${text}`);
  }

  const body = JSON.parse(text);
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error(`unexpected sync SQL response: ${text}`);
  }
  return body.data;
}

function nullableText(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function nullableInteger(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_INTERVAL_MINUTES;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`invalid interval_minute: ${value}`);
  return parsed;
}

function normalizeRow(row) {
  const id = String(row?.id || "").trim();
  const kpiName = String(row?.kpi_name || "").trim();
  const topic = String(row?.topic || "").trim();
  const sqlCommand = String(row?.sql_command || "").trim();
  const dUpdate = String(row?.d_update || "").trim();

  if (!id || !kpiName || !topic || !sqlCommand || !dUpdate) {
    throw new Error("sync SQL row requires id, kpi_name, topic, sql_command, and d_update");
  }

  return [
    id,
    kpiName,
    topic,
    nullableText(row.kpi_group),
    nullableInteger(row.interval_minute),
    JSON.stringify(row.tables_use ?? []),
    sqlCommand,
    nullableText(row.note),
    dUpdate,
  ];
}

const INSERT_SQL = `
  INSERT INTO sql_for_sync_data
    (id, kpi_name, topic, kpi_group, interval_minute, tables_use, sql_command, note, d_update)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// full replace: ล้างตารางแล้ว insert ใหม่ทั้งชุด เพื่อให้แถวที่ถูกลบที่
// ส่วนกลางหายจาก local ด้วย (REPLACE เดิมทิ้งแถวเก่าค้าง). ใช้ DELETE ไม่ใช่
// TRUNCATE เพราะ TRUNCATE เป็น DDL implicit commit — ถ้า insert พังจะ
// rollback กลับไม่ได้ ตารางว่างเปล่า. payload ว่างถือว่าผิดปกติ ไม่ล้างทิ้ง
async function saveSqlPayload(connection, rows) {
  if (!rows.length) {
    throw new Error("sync SQL payload is empty; refusing to clear sql_for_sync_data");
  }
  await connection.beginTransaction();
  try {
    await connection.execute("DELETE FROM sql_for_sync_data");
    for (const row of rows) {
      await connection.execute(INSERT_SQL, normalizeRow(row));
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const rows = await fetchSqlPayload();
  if (process.env.SYNC_DRY_RUN === "true") {
    console.log(JSON.stringify({ success: true, row_count: rows.length, ids: rows.map((row) => row.id) }));
    return;
  }

  const connection = await connectWithRetry();
  try {
    await saveSqlPayload(connection, rows);
    console.log(JSON.stringify({ success: true, row_count: rows.length }));
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { DEFAULT_INTERVAL_MINUTES, INSERT_SQL, normalizeRow, saveSqlPayload };
