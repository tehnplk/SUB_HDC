import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlFiles = [
  "s_dm_screen.sql",
  "s_ht_screen.sql",
  "s_person_pyramid.sql",
  "s_person_type_count.sql",
  "s_visit.sql",
  "s_visit_instype.sql",
  "t_service_intype_error.sql",
  "t_person_type_1_3.sql",
  "t_person_dm_ht.sql",
];

test("all persistent and temporary transform tables match raw F43 collation", async () => {
  for (const filename of sqlFiles) {
    const sql = await readFile(path.resolve(process.cwd(), "transform", "sql", filename), "utf8");
    const tableDefinitions = [...sql.matchAll(/CREATE(?: TEMPORARY)? TABLE[\s\S]*?ENGINE=InnoDB DEFAULT CHARSET=([^\s]+) COLLATE=([^;]+);/gi)];
    assert.ok(tableDefinitions.length > 0, `${filename} must define at least one table`);
    for (const definition of tableDefinitions) {
      assert.equal(definition[1].toLowerCase(), "utf8mb3", `${filename} charset`);
      assert.equal(definition[2].toLowerCase(), "utf8mb3_general_ci", `${filename} collation`);
    }
    assert.doesNotMatch(sql, /utf8mb4_unicode_ci/i);
  }
});

test("collation alignment stays inside the transform system", async () => {
  const runner = await readFile(path.resolve(process.cwd(), "transform", "run_transform.js"), "utf8");
  assert.match(runner, /TRANSFORM_COLLATION = "utf8mb3_general_ci"/i);
  assert.match(runner, /alignTransformCollation/i);
  assert.match(runner, /ALTER TABLE[\s\S]*?CONVERT TO CHARACTER SET utf8mb3 COLLATE/i);
});
