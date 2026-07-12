import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.resolve(process.cwd(), "transform", "sql", "s_person_type_count.sql");

test("s_person_type_count summarizes active residents by Typearea 1 through 5", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.match(sql, /FROM `person`/i);
  assert.match(sql, /WHERE `discharge` = '9'/i);
  for (let type = 1; type <= 5; type += 1) {
    assert.match(sql, new RegExp("SUM\\(`typearea` = '" + type + "'\\) AS `type_" + type + "`", "i"));
  }
  assert.match(sql, /GROUP BY `hospcode`/i);
});

test("s_person_type_count replaces the summary transactionally", async () => {
  const sql = await readFile(sqlPath, "utf8");
  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /DELETE FROM `s_person_type_count`;/i);
  assert.match(sql, /COMMIT;/i);
});
