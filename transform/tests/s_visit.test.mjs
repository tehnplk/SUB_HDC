import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_visit.sql");
const dropMigrationPath = path.resolve(process.cwd(), "migrate", "table_update", "20260715_drop_s_visit_monthly.sql");

test("s_visit summarizes people and visits by hospital, Thai fiscal year, and month", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_visit`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`fiscal_year` smallint UNSIGNED NOT NULL/i);
  assert.match(sql, /`month` tinyint UNSIGNED NOT NULL/i);
  assert.match(sql, /`visit_person` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /`visit_count` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `fiscal_year`, `month`\)/i);
  assert.match(sql, /FROM `service`/i);
  assert.match(sql, /`date_serv` REGEXP '\^\[0-9\]\{8\}\$'/i);
  assert.match(sql, /CASE WHEN SUBSTRING\(`date_serv`, 5, 2\) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`/i);
  assert.match(sql, /CAST\(SUBSTRING\(`date_serv`, 5, 2\) AS UNSIGNED\) AS `month`/i);
  assert.match(sql, /COUNT\(DISTINCT NULLIF\(`pid`, ''\)\) AS `visit_person`/i);
  assert.match(sql, /COUNT\(\*\) AS `visit_count`/i);
  assert.match(sql, /ORDER BY NULL;/i);
});

test("s_visit full-replaces safely without recurring table drops", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_visit`;/i);
  assert.match(sql, /INSERT INTO `s_visit`/i);
  assert.match(sql, /COMMIT;/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const migration = await readFile(dropMigrationPath, "utf8");
  assert.match(migration, /DROP TABLE IF EXISTS `s_visit_monthly`/i);
});
