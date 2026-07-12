import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { normalizeRow, saveReports } = require("../jobs/hdc/hdc_api_report.js");

test("normalizeRow maps every /report response key in table order", () => {
  assert.deepEqual(
    normalizeRow({
      id: "xwzzqarxw13v9yyxa6g4s",
      report_id: "2",
      report_name: "HBsAg coverage",
      cat_id: "1ed90bc32310b503b7ca9b32af425ae5",
      source_table: "s_anc_hb",
      main_report_id: "73daf277928bc32a1b3c8e772192543c",
      category_name: "Maternal and child health",
      main_report_name: "Prevention",
    }),
    [
      "xwzzqarxw13v9yyxa6g4s", 2, "HBsAg coverage", "1ed90bc32310b503b7ca9b32af425ae5",
      "s_anc_hb", "73daf277928bc32a1b3c8e772192543c", "Maternal and child health", "Prevention",
    ]
  );
});

test("saveReports upserts all rows in one transaction", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql, values) { calls.push({ sql, values }); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };
  await saveReports(connection, [{ id: "r1", report_id: 1, report_name: "Report", cat_id: "c1" }]);
  assert.equal(calls[0], "begin");
  assert.match(calls[1].sql, /INSERT INTO hdc_api_report/i);
  assert.match(calls[1].sql, /ON DUPLICATE KEY UPDATE/i);
  assert.deepEqual(calls[1].values, ["r1", 1, "Report", "c1", null, null, null, null]);
  assert.equal(calls[2], "commit");
});

test("saveReports rejects an empty payload", async () => {
  await assert.rejects(saveReports({}, []), /payload is empty/);
});
