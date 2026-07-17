import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "t_person_type_1_3.sql");
const dictionaryPath = path.resolve(process.cwd(), "transform", "transform_data_dict.json");

test("t_person_type_1_3 keeps one row per fiscal year and CID", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.doesNotMatch(sql, /DROP TABLE IF EXISTS `t_person_type_1_3`/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `t_person_type_1_3`/i);
  assert.match(sql, /PRIMARY KEY \(`fiscal_year`, `cid`\)/i);
  assert.match(sql, /NULLIF\(p\.`name`, ''\) AS `name`/i);
  assert.match(sql, /NULLIF\(p\.`hn`, ''\) AS `hn`/i);
  assert.doesNotMatch(sql, /CONCAT_WS\(/i);
  assert.match(sql, /p\.`typearea` AS `type`/i);
  assert.match(sql, /NULLIF\(p\.`nation`, ''\) AS `nation`/i);
  assert.match(sql, /NULLIF\(p\.`d_update`, ''\) AS `d_update`/i);
  assert.match(sql, /ADD COLUMN `d_update` text DEFAULT NULL AFTER `village_id`/i);
  assert.match(sql, /MODIFY COLUMN `d_update` text DEFAULT NULL AFTER `village_id`/i);
  assert.match(sql, /FROM `person` p/i);
  assert.match(sql, /p\.`typearea` IN \('1', '3'\)/i);
  assert.match(sql, /p\.`discharge` = '9'/i);
  assert.match(sql, /p\.`cid` <> ''/i);
  assert.match(sql, /GROUP BY `fiscal_year`, `cid`/i);
});

test("t_person_type_1_3 calculates age on the first day of fiscal year 2569", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /SET @fiscal_year := 2569/i);
  assert.match(sql, /SET @fiscal_start := STR_TO_DATE\('20251001', '%Y%m%d'\)/i);
  assert.match(sql, /TIMESTAMPDIFF\(YEAR,[\s\S]*?@fiscal_start\)/i);
  assert.match(sql, /TIMESTAMPDIFF\([\s\S]*?MONTH,[\s\S]*?@fiscal_start/i);
  assert.match(sql, /DATEDIFF\([\s\S]*?@fiscal_start/i);
});

test("t_person_type_1_3 stores fiscal-start and current age in years, months, and days", async () => {
  const sql = await readFile(sqlPath, "utf8");

  for (const field of ["age_y_fiscal", "age_m_fiscal", "age_d_fiscal", "age_y_current", "age_m_current", "age_d_current"]) {
    assert.match(sql, new RegExp("`" + field + "` text DEFAULT NULL", "i"));
    assert.match(sql, new RegExp("AS `" + field + "`", "i"));
  }
  assert.match(sql, /TIMESTAMPDIFF\(YEAR,[\s\S]*?CURDATE\(\)\)/i);
  assert.match(sql, /TIMESTAMPDIFF\([\s\S]*?MONTH,[\s\S]*?CURDATE\(\)/i);
});

test("t_person_type_1_3 selects fiscal-start insurance and builds an eight-digit village ID", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /FROM `card` c/i);
  assert.match(sql, /JOIN `tmp_person_type_1_3` p[\s\S]*?p\.`hos` = c\.`hospcode` AND p\.`pid` = c\.`pid`/i);
  assert.match(sql, /PARTITION BY c\.`hospcode`, c\.`pid`/i);
  assert.match(sql, /c\.`startdate` <= '20251001'/i);
  assert.match(sql, /c\.`expiredate` >= '20251001'/i);
  assert.match(sql, /ORDER BY c\.`d_update` DESC/i);
  assert.match(sql, /ADD PRIMARY KEY \(`hospcode`, `pid`\)/i);
  assert.match(sql, /LEFT JOIN `home` h ON h\.`hospcode` = p\.`hos` AND h\.`hid` = p\.`hid`/i);
  assert.match(sql, /CONCAT\(h\.`changwat`, h\.`ampur`, h\.`tambon`, h\.`village`\)/i);
});

test("all non-key fields are position-aligned CSV values", async () => {
  const sql = await readFile(sqlPath, "utf8");

  for (const field of ["name", "hn", "hos", "pid", "type", "sex", "nation", "d_update", "bdate", "age_y_fiscal", "age_m_fiscal", "age_d_fiscal", "age_y_current", "age_m_current", "age_d_current", "inscl", "village_id"]) {
    assert.match(
      sql,
      new RegExp("GROUP_CONCAT\\(IFNULL\\([\\s\\S]*?ORDER BY `hos`, `pid` SEPARATOR ','\\) AS `" + field + "`", "i")
    );
  }
});

test("t_person_type_1_3 fully replaces its rows transactionally", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `t_person_type_1_3`;/i);
  assert.match(sql, /INSERT INTO `t_person_type_1_3`/i);
  assert.match(sql, /COMMIT;/i);
});

test("transform dictionary documents t_person_type_1_3", async () => {
  const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
  const entry = dictionary.find((item) => item.transform_table === "t_person_type_1_3");

  assert.ok(entry);
  assert.equal(entry.sql_file, "t_person_type_1_3.sql");
  assert.deepEqual(entry.source_tables, ["person", "card", "home"]);
  assert.equal(entry.schema, "fiscal_year,cid,name,hn,hos,pid,type,sex,nation,bdate,age_y_fiscal,age_m_fiscal,age_d_fiscal,age_y_current,age_m_current,age_d_current,inscl,village_id,d_update");
});
