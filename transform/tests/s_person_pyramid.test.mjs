import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_person_pyramid.sql");
const dictionaryPath = path.resolve(process.cwd(), "transform", "transform_data_dict.json");

test("s_person_pyramid summarizes t_person_type_1_3 in five-year bands", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `s_person_pyramid`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL/i);
  assert.match(sql, /`age_range` varchar\(20\) NOT NULL/i);
  assert.match(sql, /`male` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /`female` int UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(sql, /PRIMARY KEY \(`hospcode`, `age_range`\)/i);
  assert.match(sql, /FROM `t_person_type_1_3`/i);
  assert.match(sql, /p\.`fiscal_year` = 2569/i);
  assert.match(sql, /JOIN JSON_TABLE/i);
  assert.match(sql, /sex_values\.`row_no` = hos_values\.`row_no`/i);
  assert.match(sql, /age_values\.`row_no` = hos_values\.`row_no`/i);
  assert.match(sql, /CAST\(NULLIF\(age_values\.`age_years`, ''\) AS UNSIGNED\)/i);
  assert.match(sql, /sex_values\.`sex` IN \('1', '2'\)/i);
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

test("transform dictionary records the pyramid transform dependency", async () => {
  const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
  const entry = dictionary.find((item) => item.transform_table === "s_person_pyramid");

  assert.deepEqual(entry.f43_tables, ["t_person_type_1_3"]);
  assert.match(entry.stored_data, /ปีงบประมาณ 2569/);
  assert.match(entry.stored_data, /hos, sex และ age_y/);
});
