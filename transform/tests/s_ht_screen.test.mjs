import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_ht_screen.sql");

test("s_ht_screen summarizes Typearea 1/3 hypertension screening by hospital, Thai fiscal year, and month", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_ht_screen`/i);
  assert.match(sql, /`ht_screen` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /TRIM\(n\.`sbp_1`\) <> '' AND TRIM\(n\.`dbp_1`\) <> ''/i);
  assert.match(sql, /JOIN `t_person_type_1_3`/i);
});
