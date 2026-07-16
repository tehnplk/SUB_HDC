import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "t_service_intype_error.sql");
const dictionaryPath = path.resolve(process.cwd(), "transform", "transform_data_dict.json");

test("t_service_intype_error stores FY2569 SERVICE entitlement codes absent from c_instype", async () => {
  const sql = await readFile(sqlPath, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `t_service_intype_error`/i);
  assert.match(sql, /`hospcode` varchar\(10\) NOT NULL,\s+`fiscal_year` smallint UNSIGNED NOT NULL/i);
  assert.match(sql, /CAST\(LEFT\(s\.`date_serv`, 4\) AS UNSIGNED\)\s+\+ CASE WHEN SUBSTRING\(s\.`date_serv`, 5, 2\) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`/i);
  assert.match(sql, /s\.`date_serv` AS `date_serve`/i);
  assert.match(sql, /LEFT JOIN `c_instype` c ON TRIM\(s\.`instype`\) = TRIM\(c\.`code`\)/i);
  assert.match(sql, /s\.`date_serv` >= @fiscal_start/i);
  assert.match(sql, /s\.`date_serv` < @next_fiscal_start/i);
  assert.match(sql, /c\.`code` IS NULL/i);
});

test("t_service_intype_error is documented with its requested output schema", async () => {
  const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
  const entry = dictionary.find((item) => item.transform_table === "t_service_intype_error");

  assert.deepEqual(entry?.source_tables, ["service", "c_instype"]);
  assert.equal(entry?.schema, "hospcode,fiscal_year,pid,seq,date_serve,instype");
});
