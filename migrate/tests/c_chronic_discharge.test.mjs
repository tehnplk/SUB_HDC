import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_chronic_discharge preserves the 11 source discharge codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_chronic_discharge.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_chronic_discharge`/i);
  assert.match(sql, /`code` varchar\(2\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('01', 'หาย'\)/);
  assert.match(sql, /\('11', 'กลับเป็นซ้ำ'\)/);
  assert.equal((sql.match(/^\s*\('\d{2}',/gm) || []).length, 11);
});
