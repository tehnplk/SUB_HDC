import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_prename preserves the official PERSON PRENAME codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_prename.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_prename`/i);
  assert.match(sql, /`code` varchar\(3\) NOT NULL/i);
  assert.match(sql, /`sex` varchar\(1\) NOT NULL DEFAULT ''/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('001', 'ด\.ช\.', 'เด็กชาย', '1'\)/);
  assert.match(sql, /\('003', 'นาย', 'นาย', '1'\)/);
  // 504 unique 3-digit codes
  assert.equal((sql.match(/^\s*\('\d{3}',/gm) || []).length, 504);
});
