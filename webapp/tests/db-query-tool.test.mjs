import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDbQueryLimit,
  MAX_DB_QUERY_ROWS,
  normalizeDbQuerySql,
  runDbQueryTool,
  serializeRows,
} from "../lib/db-query-tool.mjs";

test("normalizeDbQuerySql allows one read-only statement", () => {
  assert.equal(normalizeDbQuerySql(" SELECT * FROM c_file; "), "SELECT * FROM c_file");
  assert.equal(normalizeDbQuerySql("SHOW TABLES"), "SHOW TABLES");
});

test("normalizeDbQuerySql blocks unsafe SQL", () => {
  assert.throws(() => normalizeDbQuerySql("DELETE FROM c_file"), /read-only/i);
  assert.throws(() => normalizeDbQuerySql("SELECT * FROM c_file; DROP TABLE c_file"), /one SQL statement/i);
  assert.throws(() => normalizeDbQuerySql("SELECT SLEEP(1)"), /unsafe/i);
});

test("applyDbQueryLimit adds a limit to SELECT statements", () => {
  assert.equal(applyDbQueryLimit("SELECT * FROM c_file"), `SELECT * FROM c_file LIMIT ${MAX_DB_QUERY_ROWS}`);
  assert.equal(applyDbQueryLimit("SELECT * FROM c_file LIMIT 5"), "SELECT * FROM c_file LIMIT 5");
  assert.equal(applyDbQueryLimit("SHOW TABLES"), "SHOW TABLES");
});

test("serializeRows converts non-JSON-native values safely", () => {
  const rows = serializeRows([
    {
      id: 1n,
      date_update: new Date("2026-06-28T00:00:00.000Z"),
      payload: Buffer.from("ok"),
    },
  ]);

  assert.deepEqual(rows, [
    {
      id: "1",
      date_update: "2026-06-28T00:00:00.000Z",
      payload: "6f6b",
    },
  ]);
});

test("runDbQueryTool executes limited SQL and returns compact metadata", async () => {
  const calls = [];
  const result = await runDbQueryTool(
    { sql: "SELECT file_name FROM c_file" },
    async () => ({
      query(options) {
        calls.push(options);
        return [
          [{ file_name: "person" }, { file_name: "service" }],
          [{ name: "file_name" }],
        ];
      },
      end() {},
    })
  );

  assert.equal(calls[0].sql, `SELECT file_name FROM c_file LIMIT ${MAX_DB_QUERY_ROWS}`);
  assert.deepEqual(result.columns, ["file_name"]);
  assert.equal(result.rowCount, 2);
  assert.equal(result.ok, true);
});
