import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_death_pregdeath preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_death_pregdeath.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_death_pregdeath`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'เสียชีวิตระหว่างตั้งครรภ์'\)/);
  assert.match(sql, /\('2', 'เสียชีวิตระหว่างคลอดหรือหลังคลอดภายใน 42 วัน'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 2);
});
