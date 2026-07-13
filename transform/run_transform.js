// Transform daemon: รันไฟล์ transform/sql/*.sql ทุกไฟล์ วันละครั้งเวลา RUN_AT
// (default 00:00) และรันไฟล์ที่กำหนดใน HOURLY_SQL_FILES เพิ่มทุกต้นชั่วโมง
// — สร้าง/เติมตารางสรุป s_* ให้หน้า dashboard/report ใช้.
// เลื่อนรอบถ้ากำลัง import (retry ทุก POLL_MS จนสำเร็จ)
// default ไม่รันตอน start (RUN_ON_START=false) — รอถึงรอบตามตารางเท่านั้น
const fs = require("node:fs");
const path = require("node:path");

const mysql = require("mysql2/promise");

const { RUN_ORDER, runOrderRank } = require("./run_order.js");

// รัน local นอก docker: โหลด webapp/.env ให้เอง (ใน container ได้จาก env_file)
try {
  process.loadEnvFile(path.join(__dirname, "..", "webapp", ".env"));
} catch {}

const SQL_DIR = process.env.TRANSFORM_SQL_DIR || path.join(__dirname, "sql");
// รันทุกวันเวลานี้ (HH:MM ตาม TZ ของ container = Asia/Bangkok)
const RUN_AT = process.env.TRANSFORM_RUN_AT || "00:00";
// default ไม่รันรอบแรกตอน container start — รอถึงเวลา RUN_AT เท่านั้น
// (ตั้ง TRANSFORM_RUN_ON_START="true" ถ้าต้องการให้รันทันทีตอน start)
const RUN_ON_START = (process.env.TRANSFORM_RUN_ON_START || "false") === "true";
// จังหวะ retry เมื่อรอบโดนเลื่อนเพราะกำลัง import
const POLL_MS = Number(process.env.TRANSFORM_POLL_MS || 5 * 60 * 1000);
const TRANSFORM_LOCK_NAME = process.env.TRANSFORM_LOCK_NAME || "sub_hdc_transform_cycle";
const TRANSFORM_COLLATION = "utf8mb3_general_ci";
const TRANSFORM_TABLE_BY_FILE = {
  "s_person_pyramid.sql": "s_person_pyramid",
  "s_person_type_count.sql": "s_person_type_count",
  "s_visit_montly.sql": "s_visit_montly",
  "t_person_type_1_3.sql": "t_person_type_1_3",
  "t_person_dm_ht.sql": "t_person_dm_ht",
};
const HOURLY_SQL_FILES = (process.env.TRANSFORM_HOURLY_SQL_FILES || "s_visit_montly.sql")
  .split(",")
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
    multipleStatements: true, // ไฟล์หนึ่งมีหลาย statement
  };
}

function listSqlFiles(dir = SQL_DIR) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => {
        const rank = runOrderRank(a) - runOrderRank(b);
        return rank !== 0 ? rank : path.basename(a).localeCompare(path.basename(b));
      });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function listHourlySqlFiles(files = listSqlFiles(), names = HOURLY_SQL_FILES) {
  const hourlyNames = new Set(names.map((name) => String(name).toLowerCase()));
  return files.filter((file) => hourlyNames.has(path.basename(file).toLowerCase()));
}

async function isImporting(conn) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS n FROM log_import_file WHERE status IN ('pending','processing')"
  );
  return Number(row.n) > 0;
}

// log การรันราย task ลง log_transform — task ที่ fail จะเหลือ finish_at เป็น NULL
async function ensureLogTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`log_transform\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`transform_sql_task\` varchar(255) NOT NULL,
      \`start_at\` datetime NOT NULL DEFAULT current_timestamp(),
      \`finish_at\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_log_transform_task\` (\`transform_sql_task\`, \`start_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function acquireTransformLock(conn) {
  const [[row]] = await conn.query("SELECT GET_LOCK(?, 0) AS acquired", [TRANSFORM_LOCK_NAME]);
  return Number(row.acquired) === 1;
}

async function releaseTransformLock(conn) {
  await conn.query("SELECT RELEASE_LOCK(?)", [TRANSFORM_LOCK_NAME]);
}

async function alignTransformCollation(conn, filename) {
  const table = TRANSFORM_TABLE_BY_FILE[String(filename).toLowerCase()];
  if (!table) return false;
  const [rows] = await conn.query(
    `SELECT table_collation
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
      LIMIT 1`,
    [table]
  );
  if (!rows.length || String(rows[0].table_collation).toLowerCase() === TRANSFORM_COLLATION) {
    return false;
  }
  await conn.query(
    `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb3 COLLATE ${TRANSFORM_COLLATION}`
  );
  console.log(`[transform] ${table} collation aligned to ${TRANSFORM_COLLATION}`);
  return true;
}

// log พังต้องไม่ล้ม transform — คืน null แล้วรันงานต่อ
async function logStart(conn, task) {
  try {
    const [result] = await conn.query(
      "INSERT INTO `log_transform` (`transform_sql_task`, `start_at`) VALUES (?, NOW())",
      [task]
    );
    return result.insertId;
  } catch (error) {
    console.error(`[transform] log start failed: ${error.message}`);
    return null;
  }
}

async function logFinish(conn, logId) {
  if (!logId) return;
  try {
    await conn.query("UPDATE `log_transform` SET `finish_at` = NOW() WHERE `id` = ?", [logId]);
  } catch (error) {
    console.error(`[transform] log finish failed: ${error.message}`);
  }
}

// รันหนึ่งรอบ: ข้ามทั้งรอบถ้ากำลัง import (เช็คซ้ำก่อนทุกไฟล์ — import แทรก
// กลางรอบต้องหยุดทันที) ไฟล์ไหน error ข้ามไปไฟล์ถัดไป แต่คืน false เพื่อ retry รอบ
async function runOnce(files = listSqlFiles()) {
  if (!files.length) {
    console.log(`[transform] no sql files in ${SQL_DIR}`);
    return true;
  }
  const conn = await mysql.createConnection(getDbConfig());
  let lockAcquired = false;
  try {
    await ensureLogTable(conn);
    lockAcquired = await acquireTransformLock(conn);
    if (!lockAcquired) {
      console.log("[transform] another transform cycle is running; retry later");
      return false;
    }
    let ok = 0;
    let errors = 0;
    for (const file of files) {
      const name = path.basename(file);
      if (await isImporting(conn)) {
        console.log(`[transform] import in progress, stop before ${name}`);
        return false;
      }
      const sql = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim();
      if (!sql) continue;
      const started = Date.now();
      const logId = await logStart(conn, name);
      try {
        await alignTransformCollation(conn, name);
        await conn.query(sql);
        await logFinish(conn, logId);
        ok += 1;
        console.log(`[transform] ${name} done in ${Math.round((Date.now() - started) / 1000)}s`);
      } catch (error) {
        // ไม่ update finish_at — แถวที่ finish_at เป็น NULL คือรอบที่ fail
        errors += 1;
        console.error(`[transform] ${name} failed: ${error.message}`);
        await conn.query("ROLLBACK").catch(() => {});
      }
    }
    console.log(`[transform] cycle done: files=${files.length} ok=${ok} errors=${errors}`);
    return errors === 0;
  } finally {
    if (lockAcquired) await releaseTransformLock(conn).catch(() => {});
    await conn.end().catch(() => {});
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// เวลาถึงรอบถัดไป (RUN_AT ของวันนี้ ถ้าเลยแล้วเป็นของพรุ่งนี้)
function msUntilNextRun(runAt = RUN_AT, now = new Date()) {
  const [h, m] = runAt.split(":").map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function msUntilNextHour(now = new Date()) {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime() - now.getTime();
}

function getNextSchedule(hourlyFiles = listHourlySqlFiles(), runAt = RUN_AT, now = new Date()) {
  const dailyWaitMs = msUntilNextRun(runAt, now);
  const hourlyWaitMs = hourlyFiles.length ? msUntilNextHour(now) : Infinity;
  const runDaily = dailyWaitMs <= hourlyWaitMs;
  return { runDaily, waitMs: runDaily ? dailyWaitMs : hourlyWaitMs };
}

// พยายามรันจนจบรอบ — ถ้าโดนเลื่อนเพราะกำลัง import (runOnce คืน false)
// หรือ DB ล่มชั่วคราว retry ทุก POLL_MS จนกว่าจะสำเร็จ
async function runUntilDone(files) {
  for (;;) {
    try {
      if (await runOnce(files)) return;
    } catch (error) {
      console.error(`[transform] cycle error: ${error.message}`);
    }
    await sleep(POLL_MS);
  }
}

async function main() {
  console.log(
    `transform daemon started: dir=${SQL_DIR} run_at=${RUN_AT} hourly=${HOURLY_SQL_FILES.join(",")} poll=${POLL_MS}ms`
  );
  if (RUN_ON_START) await runUntilDone();
  while (true) {
    const hourlyFiles = listHourlySqlFiles();
    const { runDaily, waitMs } = getNextSchedule(hourlyFiles);
    const schedule = runDaily ? RUN_AT : "hourly visit summary";
    console.log(`[transform] next run in ${Math.round(waitMs / 60000)} min (${schedule})`);
    await sleep(waitMs);
    await runUntilDone(runDaily ? undefined : hourlyFiles);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  isImporting,
  acquireTransformLock,
  alignTransformCollation,
  releaseTransformLock,
  getNextSchedule,
  listHourlySqlFiles,
  listSqlFiles,
  RUN_ORDER,
  msUntilNextHour,
  msUntilNextRun,
  runOnce,
};
