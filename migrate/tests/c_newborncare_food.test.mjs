import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_newborncare_food preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_newborncare_food.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_newborncare_food`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'นมแม่อย่างเดียว'\)/);
  assert.match(sql, /\('4', 'นมผสมอย่างเดียว'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 4);
});
