import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_visit_monthly.sql");

test("s_visit_monthly summarizes service visits by hospcode and Thai fiscal year", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_visit_monthly`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`fiscal_year` smallint UNSIGNED NOT NULL/i);
  assert.match(sql, /`oct` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /`sep` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /`total` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `fiscal_year`\)/i);
  assert.match(sql, /FROM `service`/i);
  assert.match(sql, /`date_serv` REGEXP '\^\[0-9\]\{8\}\$'/i);
  assert.match(sql, /CASE WHEN SUBSTRING\(`date_serv`, 5, 2\) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`/i);
  assert.match(sql, /SUM\(SUBSTRING\(`date_serv`, 5, 2\) = '10'\) AS `oct`/i);
  assert.match(sql, /SUM\(SUBSTRING\(`date_serv`, 5, 2\) = '09'\) AS `sep`/i);
  assert.match(sql, /COUNT\(\*\) AS `total`/i);
  assert.match(sql, /ORDER BY NULL;/i);
});

test("s_visit_monthly migrates its old calendar-month schema before refreshing", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /column_name = 'year_month'/i);
  assert.match(sql, /DELETE FROM `s_visit_monthly`/i);
  assert.match(sql, /DROP COLUMN `year_month`/i);
  assert.match(sql, /ADD COLUMN `fiscal_year` smallint UNSIGNED NOT NULL/i);
  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_visit_monthly`;/i);
  assert.match(sql, /INSERT INTO `s_visit_monthly`/i);
  assert.match(sql, /COMMIT;/i);
});
