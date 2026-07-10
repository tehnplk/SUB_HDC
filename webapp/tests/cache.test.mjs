import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// ปิด Redis (cacheSetJson เป็น no-op) เพื่อ test logic รอบ summarize โดยไม่ต้องมี
// Redis จริง — เน้นว่าวนครบทุกแฟ้ม/ปีงบ และ error ราย file ไม่ล้มทั้งรอบ
process.env.REDIS_DISABLED = "1";

const { fiscalYearsToWarm, runCacheCycle } = await import("../lib/cache.mjs");

test("fiscalYearsToWarm returns current fiscal year plus one back", () => {
  assert.deepEqual(fiscalYearsToWarm(2026), [2026, 2025]);
});

// conn ปลอม: getTableColumns คืน hospcode + date_serv, getMonthlyRows คืน 1 แถว
function makeFakeConn() {
  const calls = { columns: 0, monthly: 0 };
  return {
    calls,
    async query(sql) {
      if (sql.includes("information_schema.COLUMNS")) {
        calls.columns += 1;
        return [[{ COLUMN_NAME: "hospcode" }, { COLUMN_NAME: "date_serv" }]];
      }
      // getMonthlyRows GROUP BY hospcode
      calls.monthly += 1;
      return [[{ hospcode: "11251", oct: 3, nov: 5 }]];
    },
  };
}

test("runCacheCycle warms every cached file across the given fiscal years", async () => {
  const conn = makeFakeConn();
  const silent = { log() {}, error() {} };
  const summary = await runCacheCycle(conn, {
    files: ["charge_opd", "labfu"],
    fiscalYearAds: [2026, 2025],
    logger: silent,
  });

  assert.equal(summary.files, 2);
  // REDIS_DISABLED=1 → cacheSetJson คืน false → keys นับเฉพาะเขียนสำเร็จจริง = 0
  // (การวนครบทุกแฟ้ม×ปี ยืนยันจาก calls.monthly แทน)
  assert.equal(summary.keys, 0);
  assert.equal(summary.errors, 0);
  assert.equal(summary.aborted, false);
  assert.equal(conn.calls.monthly, 4); // 2 files × 2 fiscal years
});

test("runCacheCycle aborts mid-cycle when an import starts", async () => {
  const conn = makeFakeConn();
  const silent = { log() {}, error() {} };
  let checks = 0;
  const summary = await runCacheCycle(conn, {
    files: ["charge_opd", "labfu", "drug_opd"],
    fiscalYearAds: [2026],
    logger: silent,
    // แฟ้มแรกยังไม่มี import (false) — แฟ้มถัดไป import เข้ามา (true) ต้องหยุดทันที
    shouldAbort: async () => (checks += 1) > 1,
  });

  assert.equal(summary.aborted, true);
  assert.equal(summary.files, 1); // ทำได้แฟ้มเดียวก่อน abort
  assert.equal(conn.calls.monthly, 1);
});

test("runCacheCycle isolates a failing file without aborting the whole cycle", async () => {
  const silent = { log() {}, error() {} };
  const conn = {
    async query(sql) {
      if (sql.includes("information_schema.COLUMNS")) {
        return [[{ COLUMN_NAME: "hospcode" }, { COLUMN_NAME: "date_serv" }]];
      }
      throw new Error("table missing");
    },
  };

  const summary = await runCacheCycle(conn, {
    files: ["charge_opd", "labfu"],
    fiscalYearAds: [2026],
    logger: silent,
  });

  assert.equal(summary.errors, 2);
  assert.equal(summary.keys, 0);
});

test("compose defines the cache container on the webapp image with mariadb+redis deps", async () => {
  const compose = await readFile(new URL("../../docker-compose.yml", import.meta.url), "utf8");
  assert.match(compose, /\n  cache:/);
  assert.match(compose, /container_name:\s*sub_hdc_cache/);
  assert.match(compose, /command:\s*node lib\/cache_daemon\.js/);
});
