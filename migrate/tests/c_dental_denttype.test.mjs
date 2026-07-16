import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_dental_denttype preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_dental_denttype.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_dental_denttype`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'กลุ่มหญิงตั้งครรภ์'\)/);
  assert.match(sql, /\('5', 'กลุ่มอื่นๆ \(นอกเหนือจาก 4 กลุ่มแรก\)'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 5);
});
