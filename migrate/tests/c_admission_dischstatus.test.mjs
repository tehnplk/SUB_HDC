import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_admission_dischstatus preserves the official ADMISSION DISCHSTATUS codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_admission_dischstatus.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_admission_dischstatus`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'หายเป็นปกติ', 'Complete Recovery'\)/);
  assert.match(sql, /\('8', 'ทารกตายคลอด', 'Dead stillbirth'\)/);
  assert.match(sql, /\('9', 'เสียชีวิต', 'Dead'\)/);
  assert.equal((sql.match(/^\s*\('\d',/gm) || []).length, 9);
});
