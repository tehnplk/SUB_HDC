import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("c_files_schema stores one row per field of every 43-file schema md", async () => {
  const sql = await readFile(
    path.resolve(process.cwd(), "table", "lookup", "c_files_schema.sql"),
    "utf8"
  );

  assert.match(sql, /DROP TABLE IF EXISTS `c_files_schema`/i);
  assert.match(sql, /CREATE TABLE `c_files_schema`/i);
  // md table columns + file_name to identify the source แฟ้ม
  assert.match(sql, /`file_name` varchar\(50\) NOT NULL/i);
  assert.match(sql, /`table_name` varchar\(50\) NOT NULL/i);
  assert.match(sql, /`no` int NOT NULL/i);
  assert.match(sql, /`caption` varchar\(255\) DEFAULT NULL/i);
  assert.match(sql, /`description` text DEFAULT NULL/i);
  assert.match(sql, /`recommend` varchar\(10\) DEFAULT NULL/i);
  assert.match(sql, /`name` varchar\(50\) NOT NULL/i);
  assert.match(sql, /`pk` varchar\(5\) DEFAULT NULL/i);
  assert.match(sql, /`type` varchar\(10\) DEFAULT NULL/i);
  assert.match(sql, /`width` varchar\(20\) DEFAULT NULL/i);
  assert.match(sql, /`not_null` varchar\(5\) DEFAULT NULL/i);
  assert.match(sql, /`is_active` tinyint\(1\) NOT NULL DEFAULT 1/i);
  assert.match(sql, /PRIMARY KEY \(`table_name`, `no`\)/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);

  // sample rows across the range
  assert.match(sql, /\('01_PERSON', 'PERSON', 1, /);
  assert.match(sql, /\('41_SPECIALPP', 'SPECIALPP', 6, [^)]*'PPSPECIAL'/);
  assert.match(sql, /\('52_POLICY', 'POLICY', /);

  // 52 files, 863 field rows
  const tuples = sql.match(/\('\d{2}_[A-Z0-9_]+', '[A-Z0-9_]+', \d+, /g) || [];
  assert.equal(tuples.length, 863);
  assert.equal(new Set(tuples.map((t) => t.split(",")[0])).size, 52);
});
