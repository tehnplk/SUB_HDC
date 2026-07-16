import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_address_addresstype preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_address_addresstype.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_address_addresstype`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'ที่อยู่ตามทะเบียนบ้าน'\)/);
  assert.match(sql, /\('2', 'ที่อยู่ที่ติดต่อได้'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 2);
});
