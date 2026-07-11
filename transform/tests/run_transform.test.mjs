import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { listHourlySqlFiles, listSqlFiles, msUntilNextHour, RUN_ORDER } = require("../run_transform.js");

test("listHourlySqlFiles selects only configured hourly transform files", () => {
  const files = [
    path.join("transform", "sql", "s_person_type_count.sql"),
    path.join("transform", "sql", "s_visit_montly.sql"),
    path.join("transform", "sql", "t_person_dm_ht.sql"),
  ];

  assert.deepEqual(
    listHourlySqlFiles(files, ["s_visit_montly.sql"]),
    [path.join("transform", "sql", "s_visit_montly.sql")]
  );
});

test("listSqlFiles runs t_person_type_1_3 before its dependent t_person_dm_ht", () => {
  const files = listSqlFiles();
  const names = files.map((f) => path.basename(f));
  const typeIdx = names.indexOf("t_person_type_1_3.sql");
  const dmHtIdx = names.indexOf("t_person_dm_ht.sql");
  assert.ok(typeIdx !== -1 && dmHtIdx !== -1, "both transform files must be present");
  assert.ok(
    typeIdx < dmHtIdx,
    `t_person_type_1_3.sql (${typeIdx}) must run before t_person_dm_ht.sql (${dmHtIdx})`
  );
});

test("RUN_ORDER lists t_person_type_1_3 before t_person_dm_ht", () => {
  assert.ok(
    RUN_ORDER.indexOf("t_person_type_1_3.sql") < RUN_ORDER.indexOf("t_person_dm_ht.sql")
  );
});

test("msUntilNextHour schedules the next top-of-hour run", () => {
  const now = new Date(2026, 6, 10, 10, 35, 12, 500);
  assert.equal(msUntilNextHour(now), 24 * 60 * 1000 + 47 * 1000 + 500);
});
