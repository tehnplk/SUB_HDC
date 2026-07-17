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

test("normalizeDbQuerySql rejects every data/structure mutation keyword outright", () => {
  const forbidden = [
    "DROP TABLE person",
    "UPDATE person SET sex = '1'",
    "DELETE FROM person",
    "ALTER TABLE person ADD COLUMN x int",
    "CREATE TABLE x (id int)",
    "TRUNCATE TABLE person",
    "INSERT INTO person VALUES (1)",
    "REPLACE INTO person VALUES (1)",
    "RENAME TABLE person TO person2",
    "GRANT ALL ON *.* TO 'x'",
    "SET GLOBAL max_connections = 1",
    "CALL some_proc()",
    "DO SLEEP(1)",
    "LOAD DATA INFILE 'x' INTO TABLE person",
    "KILL 1",
    "FLUSH TABLES",
    "OPTIMIZE TABLE person",
    "SHUTDOWN",
  ];
  for (const sql of forbidden) {
    assert.throws(() => normalizeDbQuerySql(sql), Error, `must reject: ${sql}`);
  }

  // mutation keywords hidden inside an allowed statement are still rejected
  assert.throws(() => normalizeDbQuerySql("SELECT 1 UNION SELECT 2 FROM x WHERE id IN (SELECT id FROM y) UNION ALL SELECT (UPDATE z)"), /unsafe/i);
  assert.throws(() => normalizeDbQuerySql("EXPLAIN UPDATE person SET sex = '1'"), /unsafe/i);
  assert.throws(() => normalizeDbQuerySql("SELECT * FROM person FOR UPDATE"), /unsafe/i);
});

test("normalizeDbQuerySql rejects SQL comments that could hide executable code", () => {
  assert.throws(() => normalizeDbQuerySql("SELECT 1 /*! DROP TABLE person */"), /comment|unsafe/i);
  assert.throws(() => normalizeDbQuerySql("SELECT 1 -- trailing"), /comment/i);
  assert.throws(() => normalizeDbQuerySql("SELECT 1 # trailing"), /comment/i);
  assert.throws(() => normalizeDbQuerySql("SELECT /**/ 1"), /comment/i);
});

test("serializeRows truncates long text cells before they reach the model", () => {
  const longText = "ก".repeat(500);
  const rows = serializeRows([{ description: longText, code: "1B003" }]);
  assert.equal(rows[0].description.length, 301);
  assert.ok(rows[0].description.endsWith("…"));
  assert.equal(rows[0].code, "1B003");
});

test("normalizeDbQuerySql keeps normal read-only queries working", () => {
  const allowed = [
    "SELECT hospcode, COUNT(*) FROM specialpp GROUP BY hospcode",
    "SELECT no, name, caption FROM c_files_schema WHERE table_name = 'SPECIALPP'",
    "SHOW TABLES LIKE 's\\_%'",
    "DESCRIBE person",
    "DESC service",
    "EXPLAIN SELECT * FROM person WHERE cid = '1'",
    "SELECT * FROM s_visit WHERE fiscal_year = '2569' AND month = 1",
  ];
  for (const sql of allowed) {
    assert.equal(normalizeDbQuerySql(sql), sql, `must allow: ${sql}`);
  }
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
