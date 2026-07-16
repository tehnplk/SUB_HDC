import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_diagnosis_opd_diagtype preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_diagnosis_opd_diagtype.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_diagnosis_opd_diagtype`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'PRINCIPLE DX \(การวินิจฉัยโรคหลัก\)'\)/);
  assert.match(sql, /\('7', 'Morphology Code \(รหัสเกี่ยวกับเนื้องอก\)'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 7);
});
