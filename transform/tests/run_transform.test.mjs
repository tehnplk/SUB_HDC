import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { listHourlySqlFiles, msUntilNextHour } = require("../run_transform.js");

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

test("msUntilNextHour schedules the next top-of-hour run", () => {
  const now = new Date(2026, 6, 10, 10, 35, 12, 500);
  assert.equal(msUntilNextHour(now), 24 * 60 * 1000 + 47 * 1000 + 500);
});
