import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_vstatus preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_vstatus.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_vstatus`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'กำนัน ผู้ใหญ่บ้าน'\)/);
  assert.match(sql, /\('5', 'อื่นๆ'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 5);
});
