import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_visit_instype.sql");

test("s_visit_instype summarizes visits by hospital, Thai fiscal year, month, and insurance code", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_visit_instype`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`fiscal_year` smallint UNSIGNED NOT NULL/i);
  assert.match(sql, /`month` tinyint UNSIGNED NOT NULL/i);
  assert.match(sql, /`instype_code` varchar\(4\) NOT NULL/i);
  assert.match(sql, /`count_visit` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `fiscal_year`, `month`, `instype_code`\)/i);
  assert.match(sql, /FROM `service`/i);
  assert.match(sql, /`date_serv` REGEXP '\^\[0-9\]\{8\}\$'/i);
  assert.match(sql, /`instype` AS `instype_code`/i);
  assert.match(sql, /AND `instype` != ''/i);
  assert.match(sql, /COUNT\(\*\) AS `count_visit`/i);
  assert.doesNotMatch(sql, /JOIN `c_instype`/i);
});

test("s_visit_instype full-replaces its summary transactionally", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_visit_instype`;/i);
  assert.match(sql, /INSERT INTO `s_visit_instype`/i);
  assert.match(sql, /COMMIT;/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /ON DUPLICATE KEY UPDATE/i);
});
