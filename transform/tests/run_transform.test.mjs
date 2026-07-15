import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  alignTransformCollation,
  getNextSchedule,
  listHourlySqlFiles,
  listSqlFiles,
  msUntilNextHour,
  msUntilNextRun,
  RUN_ORDER,
} = require("../run_transform.js");

test("listHourlySqlFiles selects only configured hourly transform files", () => {
  const files = [
    path.join("transform", "sql", "s_person_type_count.sql"),
    path.join("transform", "sql", "s_visit_monthly.sql"),
    path.join("transform", "sql", "t_person_dm_ht.sql"),
  ];

  assert.deepEqual(
    listHourlySqlFiles(files, ["s_visit_monthly.sql"]),
    [path.join("transform", "sql", "s_visit_monthly.sql")]
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

test("RUN_ORDER lists t_person_type_1_3 before s_person_pyramid", () => {
  assert.ok(
    RUN_ORDER.indexOf("t_person_type_1_3.sql") < RUN_ORDER.indexOf("s_person_pyramid.sql")
  );
});

test("msUntilNextHour schedules the next top-of-hour run", () => {
  const now = new Date(2026, 6, 10, 10, 35, 12, 500);
  assert.equal(msUntilNextHour(now), 24 * 60 * 1000 + 47 * 1000 + 500);
});

test("daily transforms schedule at midnight", () => {
  const now = new Date(2026, 6, 10, 23, 30, 0, 0);
  assert.equal(msUntilNextRun("00:00", now), 30 * 60 * 1000);
});

test("daily transform wins when midnight overlaps the hourly schedule", () => {
  const now = new Date(2026, 6, 10, 23, 30, 0, 0);
  assert.deepEqual(getNextSchedule(["s_visit_monthly.sql"], "00:00", now), {
    runDaily: true,
    waitMs: 30 * 60 * 1000,
  });
});

test("transform cycles use a database lock and retry when any SQL task fails", async () => {
  const source = await readFile(path.resolve(process.cwd(), "transform", "run_transform.js"), "utf8");
  assert.match(source, /SELECT GET_LOCK\(\?, 0\) AS acquired/i);
  assert.match(source, /SELECT RELEASE_LOCK\(\?\)/i);
  assert.match(source, /return errors === 0;/i);
});

test("transform owns one-time collation alignment for an existing output table", async () => {
  const calls = [];
  const conn = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (/information_schema\.tables/i.test(sql)) {
        return [[{ table_collation: "utf8mb4_unicode_ci" }]];
      }
      return [[]];
    },
  };

  assert.equal(await alignTransformCollation(conn, "t_person_dm_ht.sql"), true);
  assert.deepEqual(calls[0].values, ["t_person_dm_ht"]);
  assert.match(calls[1].sql, /ALTER TABLE `t_person_dm_ht` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci/i);
});

test("transform skips collation conversion when output already matches raw", async () => {
  const calls = [];
  const conn = {
    async query(sql, values) {
      calls.push({ sql, values });
      return [[{ table_collation: "utf8mb3_general_ci" }]];
    },
  };

  assert.equal(await alignTransformCollation(conn, "s_visit_monthly.sql"), false);
  assert.equal(calls.length, 1);
});
