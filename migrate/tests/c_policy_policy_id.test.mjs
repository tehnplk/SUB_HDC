import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_policy_policy_id preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_policy_policy_id.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_policy_policy_id`/i);
  assert.match(sql, /`code` varchar\(3\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('001', 'วัดเส้นรอบศรีษะเด็กแรกเกิด'\)/);
  assert.match(sql, /\('001', 'วัดเส้นรอบศรีษะเด็กแรกเกิด'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 1);
});
