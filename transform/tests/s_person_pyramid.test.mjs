import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_person_pyramid.sql");

test("s_person_pyramid summarizes Typearea 1/3 active people in five-year bands", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_person_pyramid`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`age_range` varchar\(20\) NOT NULL/i);
  assert.match(sql, /`male` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /`female` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `age_range`\)/i);
  assert.match(sql, /FROM `person`/i);
  assert.match(sql, /`discharge` = '9'/i);
  assert.match(sql, /`typearea` IN \('1', '3'\)/i);
  assert.match(sql, /`sex` IN \('1', '2'\)/i);
  assert.match(sql, /TIMESTAMPDIFF\(YEAR, STR_TO_DATE\(`birth`, '%Y%m%d'\), CURDATE\(\)\)/i);
  assert.match(sql, /FLOOR\(`age_years` \/ 5\) \* 5/i);
  assert.match(sql, /WHEN `age_years` >= 85 THEN '85\+'/i);
  assert.match(sql, /ELSE FLOOR\(`age_years` \/ 5\) \* 5 END/i);
  assert.match(sql, /SUM\(`sex` = '1'\) AS `male`/i);
  assert.match(sql, /SUM\(`sex` = '2'\) AS `female`/i);
});

test("s_person_pyramid replaces the complete summary in one transaction", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_person_pyramid`;/i);
  assert.match(sql, /INSERT INTO `s_person_pyramid`/i);
  assert.match(sql, /COMMIT;/i);
});
