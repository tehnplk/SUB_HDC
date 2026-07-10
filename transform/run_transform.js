// Transform daemon: รันไฟล์ transform/sql/*.sql ทุกไฟล์ วันละครั้งเวลา RUN_AT
// (default 00:00) + รอบแรกตอน start — สร้าง/เติมตารางสรุป s_* ให้หน้า
// dashboard/report ใช้. เลื่อนรอบถ้ากำลัง import (retry ทุก POLL_MS จนสำเร็จ)
const fs = require("node:fs");
const path = require("node:path");

const mysql = require("mysql2/promise");

// รัน local นอก docker: โหลด webapp/.env ให้เอง (ใน container ได้จาก env_file)
try {
  process.loadEnvFile(path.join(__dirname, "..", "webapp", ".env"));
} catch {}

const SQL_DIR = process.env.TRANSFORM_SQL_DIR || path.join(__dirname, "sql");
// รันทุกวันเวลานี้ (HH:MM ตาม TZ ของ container = Asia/Bangkok)
const RUN_AT = process.env.TRANSFORM_RUN_AT || "00:00";
// รอบแรกตอน container start ด้วย — เครื่องติดตั้งใหม่จะได้มีตาราง s_* ทันที
// ไม่ต้องรอเที่ยงคืน (ตั้ง "false" ถ้าไม่ต้องการ)
const RUN_ON_START = (process.env.TRANSFORM_RUN_ON_START || "true") === "true";
// จังหวะ retry เมื่อรอบโดนเลื่อนเพราะกำลัง import
const POLL_MS = Number(process.env.TRANSFORM_POLL_MS || 5 * 60 * 1000);

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
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
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
// กลางรอบต้องหยุดทันที) ไฟล์ไหน error ข้ามไปไฟล์ถัดไป. คืน true ถ้ารันจบรอบ
async function runOnce(files = listSqlFiles()) {
  if (!files.length) {
    console.log(`[transform] no sql files in ${SQL_DIR}`);
    return true;
  }
  const conn = await mysql.createConnection(getDbConfig());
  try {
    await ensureLogTable(conn);
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
    return true;
  } finally {
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

// พยายามรันจนจบรอบ — ถ้าโดนเลื่อนเพราะกำลัง import (runOnce คืน false)
// หรือ DB ล่มชั่วคราว retry ทุก POLL_MS จนกว่าจะสำเร็จ
async function runUntilDone() {
  for (;;) {
    try {
      if (await runOnce()) return;
    } catch (error) {
      console.error(`[transform] cycle error: ${error.message}`);
    }
    await sleep(POLL_MS);
  }
}

async function main() {
  console.log(`transform daemon started: dir=${SQL_DIR} run_at=${RUN_AT} poll=${POLL_MS}ms`);
  if (RUN_ON_START) await runUntilDone();
  while (true) {
    const waitMs = msUntilNextRun();
    console.log(`[transform] next run in ${Math.round(waitMs / 60000)} min (${RUN_AT})`);
    await sleep(waitMs);
    await runUntilDone();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { isImporting, listSqlFiles, msUntilNextRun, runOnce };
