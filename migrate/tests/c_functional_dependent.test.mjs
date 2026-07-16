import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_functional_dependent preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_functional_dependent.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_functional_dependent`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'ไม่พึ่งพิง'\)/);
  assert.match(sql, /\('3', 'พึ่งพิงมาก'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 3);
});
