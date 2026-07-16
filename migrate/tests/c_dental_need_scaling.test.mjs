import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_dental_need_scaling preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_dental_need_scaling.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_dental_need_scaling`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'ต้องขูดหินน้ำลาย'\)/);
  assert.match(sql, /\('2', 'ไม่ต้องขูดหินน้ำลาย'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 2);
});
