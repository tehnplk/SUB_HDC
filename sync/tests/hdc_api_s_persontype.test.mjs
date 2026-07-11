import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  currentThaiFiscalYear,
  normalizeRow,
  savePersontype,
} = require("../jobs/hdc/hdc_api_s_persontype.js");

test("currentThaiFiscalYear rolls to the next year from October", () => {
  assert.equal(currentThaiFiscalYear(new Date("2026-07-11")), "2569");
  assert.equal(currentThaiFiscalYear(new Date("2026-09-30")), "2569");
  assert.equal(currentThaiFiscalYear(new Date("2026-10-01")), "2570");
});

test("normalizeRow maps the HDC payload fields in column order", () => {
  assert.deepEqual(
    normalizeRow({
      id: "cb4e5a29",
      hospcode: "77610",
      areacode: "65010100",
      date_com: "202607090636",
      b_year: "2569",
      type1: 56052, type2: 16242, type3: 6704, type4: 143919, type5: 13,
      type1c: 47227, type2c: 8263, type3c: 5342, type4c: 6624, type5c: 1,
    }),
    [
      "2569", "77610", "65010100",
      56052, 16242, 6704, 143919, 13,
      47227, 8263, 5342, 6624, 1,
      "202607090636",
    ]
  );
});

test("normalizeRow requires hospcode and defaults missing counts to 0", () => {
  assert.throws(
    () => normalizeRow({ b_year: "2569" }),
    /requires hospcode/
  );

  const row = normalizeRow({ b_year: "2569", hospcode: "07603" });
  assert.deepEqual(row, ["2569", "07603", null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null]);
});

test("savePersontype replaces only the fetched year in one transaction", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql, values) { calls.push({ sql, values }); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };

  await savePersontype(connection, "2569", [
    { b_year: "2569", hospcode: "07603", areacode: "65090401", type1: 1696 },
  ]);

  assert.equal(calls[0], "begin");
  assert.match(calls[1].sql, /DELETE FROM hdc_api_s_persontype WHERE b_year = \?/i);
  assert.deepEqual(calls[1].values, ["2569"]);
  assert.match(calls[2].sql, /INSERT INTO hdc_api_s_persontype/i);
  assert.equal(calls[3], "commit");
});

test("savePersontype rolls back when an insert fails", async () => {
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
    () => savePersontype(connection, "2569", [{ b_year: "2569", hospcode: "07603" }]),
    /insert boom/
  );

  assert.deepEqual(calls, ["begin", "DELETE FROM", "INSERT INTO", "rollback"]);
});

test("savePersontype refuses an empty payload instead of clearing the year", async () => {
  const connection = {
    async beginTransaction() { throw new Error("must not start a transaction"); },
    async execute() { throw new Error("must not touch the table"); },
    async commit() {},
    async rollback() {},
  };

  await assert.rejects(
    () => savePersontype(connection, "2569", []),
    /payload is empty/
  );
});
