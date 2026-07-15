import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_dm_screen.sql");

test("s_dm_screen summarizes Typearea 1/3 diabetes screening by hospital, Thai fiscal year, and month", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_dm_screen`/i);
  assert.match(sql, /`dm_screen` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /TRIM\(n\.`bslevel`\) <> ''/i);
  assert.match(sql, /JOIN `t_person_type_1_3`/i);
});
