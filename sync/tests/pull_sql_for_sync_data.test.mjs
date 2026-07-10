import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { normalizeRow, saveSqlPayload } = require("../jobs/pull_sql_for_sync_data.js");

test("normalizeRow preserves the sync SQL payload fields", () => {
  assert.deepEqual(
    normalizeRow({
      id: "7",
      kpi_name: "MMR2 coverage",
      topic: "vaccination",
      kpi_group: "EPI",
      interval_minute: null,
      tables_use: ["epi", "person"],
      sql_command: "SELECT 1",
      note: "test",
      d_update: "2026-07-10 13:23:40",
    }),
    [
      "7",
      "MMR2 coverage",
      "vaccination",
      "EPI",
      90,
      '["epi","person"]',
      "SELECT 1",
      "test",
      "2026-07-10 13:23:40",
    ]
  );
});

test("normalizeRow requires a non-empty topic", () => {
  assert.throws(
    () => normalizeRow({
      id: "7",
      kpi_name: "MMR2 coverage",
      sql_command: "SELECT 1",
      d_update: "2026-07-10 13:23:40",
    }),
    /requires id, kpi_name, topic, sql_command, and d_update/
  );
});

test("saveSqlPayload clears the table then inserts every fetched row in one transaction", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql, values) { calls.push({ sql, values }); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };

  await saveSqlPayload(connection, [
    {
      id: 3,
      kpi_name: "Screening",
      topic: "screening",
      tables_use: ["person"],
      sql_command: "SELECT 1",
      d_update: "2026-07-10 13:23:40",
    },
  ]);

  assert.equal(calls[0], "begin");
  assert.match(calls[1].sql, /DELETE FROM sql_for_sync_data/i);
  assert.match(calls[2].sql, /INSERT INTO sql_for_sync_data/i);
  assert.deepEqual(calls[2].values, [
    "3", "Screening", "screening", null, 90, '["person"]', "SELECT 1", null, "2026-07-10 13:23:40",
  ]);
  assert.equal(calls[3], "commit");
});

test("saveSqlPayload rolls back the delete when an insert fails", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql) {
      calls.push(sql.trim().split(/\s+/, 2).join(" "));
      if (/INSERT/i.test(sql)) throw new Error("insert boom");
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };

  await assert.rejects(
    () => saveSqlPayload(connection, [
      {
        id: 3,
        kpi_name: "Screening",
        topic: "screening",
        tables_use: ["person"],
        sql_command: "SELECT 1",
        d_update: "2026-07-10 13:23:40",
      },
    ]),
    /insert boom/
  );

  assert.deepEqual(calls, ["begin", "DELETE FROM", "INSERT INTO", "rollback"]);
});

test("saveSqlPayload refuses an empty payload instead of clearing the table", async () => {
  const connection = {
    async beginTransaction() { throw new Error("must not start a transaction"); },
    async execute() { throw new Error("must not touch the table"); },
    async commit() {},
    async rollback() {},
  };

  await assert.rejects(
    () => saveSqlPayload(connection, []),
    /payload is empty/
  );
});
