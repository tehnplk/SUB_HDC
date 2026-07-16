import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_drug_ipd_typedrug preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_drug_ipd_typedrug.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_drug_ipd_typedrug`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'ยาที่จ่ายให้ผู้ป่วยระหว่างรักษาในโรงพยาบาล'\)/);
  assert.match(sql, /\('2', 'ยาที่จ่ายให้ผู้ป่วยเมื่อจำหน่ายผู้ป่วย เพื่อกลับไปใช้ที่บ้าน'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 2);
});
