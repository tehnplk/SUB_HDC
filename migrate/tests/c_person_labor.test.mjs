import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_labor preserves the official PERSON LABOR codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_labor.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_labor`/i);
  assert.match(sql, /`code` varchar\(2\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  // zero-padded 2-digit codes, all 30 rows present
  assert.equal((sql.match(/^\s*\('\d{2}',/gm) || []).length, 30);
  assert.match(sql, /\('01',/);
  assert.match(sql, /\('39',/);
});
