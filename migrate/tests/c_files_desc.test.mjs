import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("c_files_desc preserves the 43-file structure metadata", async () => {
  const sql = await readFile(
    path.resolve(process.cwd(), "table", "lookup", "c_files_desc.sql"),
    "utf8"
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_files_desc`/i);
  assert.match(sql, /`table_name` varchar\(50\) NOT NULL/i);
  assert.match(sql, /`description` text NOT NULL/i);
  assert.match(sql, /PRIMARY KEY \(`table_name`\)/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('PERSON', 'Version 2\.4\.1/);
  assert.match(sql, /\('DENTAL', 'Version 2\.4\.1/);
  assert.match(sql, /\('POLICY', 'Version 2\.4\.1/);
  assert.equal((sql.match(/^\s*\('[A-Z_]+',/gm) || []).length, 52);
});
