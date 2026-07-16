import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_discharge preserves the supplied PERSON discharge codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_discharge.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_discharge`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'ตาย'\)/);
  assert.match(sql, /\('9', 'ไม่จำหน่าย'\)/);
  assert.equal((sql.match(/^\s*\('\d',/gm) || []).length, 4);
});
