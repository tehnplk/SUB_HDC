import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_visit_montly.sql");

test("s_visit_montly summarizes valid service visits by hospcode and calendar month", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_visit_montly`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`year_month` char\(6\) NOT NULL/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `year_month`\)/i);
  assert.match(sql, /LEFT\(`date_serv`, 6\) AS `year_month`/i);
  assert.match(sql, /COUNT\(\*\) AS `visit_count`/i);
  assert.match(sql, /FROM `service`/i);
  assert.match(sql, /`date_serv` REGEXP '\^\[0-9\]\{8\}\$'/i);
  assert.match(sql, /GROUP BY `hospcode`, LEFT\(`date_serv`, 6\)/i);
});

test("s_visit_montly refreshes within a transaction", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_visit_montly`;/i);
  assert.match(sql, /INSERT INTO `s_visit_montly`/i);
  assert.match(sql, /COMMIT;/i);
});
