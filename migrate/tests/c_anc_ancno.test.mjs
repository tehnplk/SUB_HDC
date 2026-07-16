import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_anc_ancno preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_anc_ancno.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_anc_ancno`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'การนัดช่วงที่ 1 อายุครรภ์ ≤ 12 สัปดาห์'\)/);
  assert.match(sql, /\('5', 'การนัดช่วงที่ 5 อายุครรภ์ 32 - 40 สัปดาห์'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 5);
});
