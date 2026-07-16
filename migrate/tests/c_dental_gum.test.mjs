import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_dental_gum preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_dental_gum.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_dental_gum`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('0', 'ปกติ'\)/);
  assert.match(sql, /\('9', 'ไม่มีฟันหรือตรวจไม่ได้'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 5);
});
