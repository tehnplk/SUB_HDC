import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_nutrition_food preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_nutrition_food.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_nutrition_food`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('0', 'เลิกดื่มนมแล้ว \(เฉพาะอายุเด็ก 0-2 ปี 11 เดือน 29 วัน\)'\)/);
  assert.match(sql, /\('5', 'นมและอาหารอื่นๆ'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 6);
});
