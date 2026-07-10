import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { normalizeRow, saveSqlPayload } = require("../post/pull_sql_for_sync_data.js");

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

test("saveSqlPayload replaces every fetched row in one transaction", async () => {
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
  assert.match(calls[1].sql, /REPLACE INTO sql_for_sync_data/i);
  assert.doesNotMatch(calls[1].sql, /ON DUPLICATE KEY UPDATE/i);
  assert.deepEqual(calls[1].values, [
    "3", "Screening", "screening", null, 90, '["person"]', "SELECT 1", null, "2026-07-10 13:23:40",
  ]);
  assert.equal(calls[2], "commit");
});
