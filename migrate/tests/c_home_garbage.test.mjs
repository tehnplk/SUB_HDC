import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_home_garbage preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_home_garbage.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_home_garbage`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'กำจัดเองโดยการฝัง'\)/);
  assert.match(sql, /\('9', 'ไม่ทราบ'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 6);
});
