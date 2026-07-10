// Cache daemon: นับสรุป hos-list ของแฟ้มใหญ่ (charge/diagnosis opd+ipd, labfu)
// ล่วงหน้าเก็บลง Redis ทุก 24 ชม. + รันทันทีตอน start (กัน cold start หลัง deploy).
// รันเป็น container ของตัวเอง (service `cache` — sub_hdc_cache) ใช้ webapp image ร่วมกัน เหมือน
// importer/sync. อ่านตารางใหญ่หนัก จึง:
//   - ข้ามรอบถ้ากำลัง import (LOAD DATA เขียนตารางอยู่ อย่าแย่ง disk I/O)
//   - guard กันรอบซ้อน (ถ้ารอบก่อนยังไม่จบ ข้าม)
const mysql = require("mysql2/promise");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const CYCLE_MS = Number(process.env.CACHE_INTERVAL_MS || 24 * 60 * 60 * 1000);
// เช็คบ่อยกว่ารอบจริง เพื่อ (1) รู้ว่าถึงเวลารอบใหม่ (2) ถ้ารอบก่อนโดนข้ามเพราะ
// import อยู่ จะได้ลองใหม่เร็วขึ้นเมื่อ import จบ ไม่ต้องรอเต็ม 24 ชม.
const POLL_MS = Number(process.env.CACHE_POLL_MS || 5 * 60 * 1000);

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

async function withDb(callback) {
  const connection = await mysql.createConnection(getDbConfig());
  try {
    return await callback(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let shuttingDown = false;
let cycleRunning = false; // guard กันรอบซ้อน

// รันหนึ่งรอบ: ข้ามถ้ากำลัง import, ข้ามถ้ารอบก่อนยังไม่จบ. คืน true ถ้ารันจริง
async function runOnce({ isImporting, runCacheCycle }) {
  if (cycleRunning) {
    console.log("[cache] previous cycle still running, skip");
    return false;
  }
  cycleRunning = true;
  try {
    return await withDb(async (conn) => {
      if (await isImporting(conn)) {
        console.log("[cache] import in progress, skip this cycle");
        return false;
      }
      const started = Date.now();
      // เช็ค import ก่อนทุกแฟ้ม — รอบเต็มบนเครื่องจริงยาวหลายสิบนาที ถ้า user
      // สั่ง import กลางรอบต้องหยุดทันที ไม่แย่ง disk I/O กับ LOAD DATA
      const summary = await runCacheCycle(conn, {
        shouldAbort: () => isImporting(conn),
      });
      const secs = Math.round((Date.now() - started) / 1000);
      if (summary.aborted) {
        // ไม่นับเป็นรอบสำเร็จ → lastRun ไม่ถูกตั้ง → poll (5 นาที) จะเริ่มรอบ
        // ใหม่เองหลัง import จบ ไม่ต้องรอเต็ม 24 ชม.
        console.log(
          `[cache] cycle aborted after ${secs}s (import started): files=${summary.files} keys=${summary.keys}`
        );
        return false;
      }
      console.log(
        `[cache] cycle done in ${secs}s: files=${summary.files} keys=${summary.keys} errors=${summary.errors}`
      );
      return true;
    });
  } catch (error) {
    // AggregateError (เช่น DB connect ล้มตอน container start) message ว่าง —
    // ดึงรายละเอียดจาก errors ข้างในให้ log วินิจฉัยได้
    const detail =
      error?.message ||
      (Array.isArray(error?.errors)
        ? error.errors.map((e) => e?.message || String(e)).join("; ")
        : "") ||
      String(error);
    console.error(`[cache] cycle error: ${detail}`);
    return false;
  } finally {
    cycleRunning = false;
  }
}

async function main() {
  const { isImporting } = await import("./import-status.mjs");
  const { runCacheCycle } = await import("./cache.mjs");
  const { waitRedisReady } = await import("./redis.mjs");
  const deps = { isImporting, runCacheCycle };

  console.log(`cache daemon started: interval=${CYCLE_MS}ms poll=${POLL_MS}ms`);

  // รอ Redis ต่อเสร็จก่อนรอบแรก — ไม่งั้น write แรก ๆ ของรอบบูตถูกโยนทิ้งเงียบ
  // (enableOfflineQueue:false) key จะขาดไปจน cycle ถัดไป
  if (!(await waitRedisReady())) {
    console.log("[cache] redis not ready after wait — first cycle may write nothing");
  }

  // รันทันทีตอน start (กัน cold start หลัง deploy) — ถ้า import อยู่จะข้ามแล้วรอ
  // poll รอบถัดไป
  let lastRun = 0;
  if (await runOnce(deps)) {
    lastRun = Date.now();
  }

  while (!shuttingDown) {
    await sleep(POLL_MS);
    if (shuttingDown) break;
    if (Date.now() - lastRun < CYCLE_MS) continue;
    if (await runOnce(deps)) {
      lastRun = Date.now();
    }
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`received ${signal}, shutting down`);
  setTimeout(() => process.exit(0), 1000).unref();
}

if (require.main === module) {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { runOnce };
