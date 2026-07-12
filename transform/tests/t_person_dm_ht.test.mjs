import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "t_person_dm_ht.sql");
const dictionaryPath = path.resolve(process.cwd(), "transform", "transform_data_dict.json");

test("t_person_dm_ht preserves the documented output schema", async () => {
  const sql = await readFile(sqlPath, "utf8");
  const createBody = sql.match(/CREATE TABLE IF NOT EXISTS `t_person_dm_ht` \(([\s\S]*?)\) ENGINE=/i)?.[1];
  assert.ok(createBody, "CREATE TABLE body must exist");
  const columns = [...createBody.matchAll(/^\s+`([^`]+)`/gm)].map((match) => match[1]);
  assert.deepEqual(columns, [
    "cid", "hos_person_type_1_3", "pid_at_hos_type_1_3", "hn", "nation",
    "dm_code", "hos_dx_dm", "date_dx_dm", "ht_code", "hos_dx_ht", "date_dx_ht",
  ]);
  assert.match(createBody, /PRIMARY KEY \(`cid`\)/i);
});

test("t_person_dm_ht uses indexed diagnosis ranges and fiscal-year joins", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.doesNotMatch(sql, /WHERE[^\n]*REGEXP '\^E1/i);
  assert.match(sql, /d\.`diagcode` >= 'E10' AND d\.`diagcode` < 'E15'/i);
  assert.match(sql, /d\.`diagcode` >= 'I10' AND d\.`diagcode` < 'I16'/i);
  assert.match(sql, /c\.`chronic` >= 'E10' AND c\.`chronic` < 'E15'/i);
  assert.match(sql, /c\.`chronic` >= 'I10' AND c\.`chronic` < 'I16'/i);
  assert.match(sql, /FORCE INDEX \(`idx_chronic_chronic_cid`\)/i);
  assert.ok(
    (sql.match(/p\.`fiscal_year` = 2569/g) || []).length >= 7,
    "every diagnosis branch and final update must constrain fiscal_year"
  );
});

test("t_person_dm_ht refreshes transactionally without dropping the live table", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.doesNotMatch(sql, /DROP TABLE IF EXISTS `t_person_dm_ht`/i);
  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `t_person_dm_ht`;/i);
  assert.match(sql, /INSERT INTO `t_person_dm_ht`/i);
  assert.match(sql, /COMMIT;/i);
});

test("transform dictionary keeps the t_person_dm_ht schema contract", async () => {
  const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
  const entry = dictionary.find((item) => item.transform_table === "t_person_dm_ht");
  assert.ok(entry);
  assert.equal(
    entry.schema,
    "cid,hos_person_type_1_3,pid_at_hos_type_1_3,hn,nation,dm_code,hos_dx_dm,date_dx_dm,ht_code,hos_dx_ht,date_dx_ht"
  );
});
