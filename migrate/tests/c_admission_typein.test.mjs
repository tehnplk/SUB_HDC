import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_admission_typein preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_admission_typein.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_admission_typein`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'มารับบริการเอง'\)/);
  assert.match(sql, /\('4', 'ได้รับการส่งตัวจากบริการ EMS'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 4);
});
