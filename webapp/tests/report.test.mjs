import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import { fetchReport, latestTransformAt, resolveReportScope, xlsxResponse } from "../lib/report.mjs";
import { formatThaiDate, formatThaiDateTime } from "../lib/thai-date.mjs";

const HOSPITALS = [
  { hospcode: "11111", hospname_short: "รพ.สต.หนึ่ง", affiliation: "สสอ." },
  { hospcode: "22222", hospname_short: "รพ.สอง", affiliation: "รพ." },
];

function fakeConn({ years = [2026, 2025], hospcodes = ["11111", "22222"], transform } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      if (/FROM c_hospital/.test(sql)) return [HOSPITALS];
      if (/SELECT DISTINCT fiscal_year/.test(sql)) return [years.map((fiscal_year) => ({ fiscal_year }))];
      if (/SELECT DISTINCT hospcode/.test(sql)) return [hospcodes.map((hospcode) => ({ hospcode }))];
      if (/log_transform/.test(sql)) {
        if (transform instanceof Error) throw transform;
        return [transform ? [{ finish_at: transform }] : []];
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

const scopeOf = (conn, query, options = { tables: ["t_report"] }) =>
  resolveReportScope(conn, new URLSearchParams(query), options);

test("scope falls back to the latest fiscal year when none or an unknown one is requested", async () => {
  for (const query of ["", "fiscalYear=1999", "fiscalYear=abc"]) {
    const scope = await scopeOf(fakeConn(), query);
    assert.equal(scope.fiscalYear, 2026, query);
    assert.deepEqual(scope.fiscalYears, [2026, 2025]);
  }
  const scope = await scopeOf(fakeConn(), "fiscalYear=2025");
  assert.equal(scope.fiscalYear, 2025);
  assert.equal(scope.where, "fiscal_year = ?");
  assert.deepEqual(scope.values, [2025]);
  assert.equal(scope.badRequest, null);
  assert.equal((await scopeOf(fakeConn({ years: [] }), "")).fiscalYear, null);
});

test("scope lists hospitals for the chosen year only when asked, across every table", async () => {
  const conn = fakeConn();
  await scopeOf(conn, "fiscalYear=2025", { tables: ["s_a", "s_b"], hospitalsPerYear: true });
  const hospitalQuery = conn.calls.find((call) => /SELECT DISTINCT hospcode/.test(call.sql));
  assert.match(hospitalQuery.sql, /FROM `s_a` WHERE fiscal_year = \? UNION SELECT hospcode FROM `s_b` WHERE fiscal_year = \?/);
  assert.deepEqual(hospitalQuery.values, [2025, 2025]);

  const allYears = fakeConn();
  await scopeOf(allYears, "", { tables: ["s_a"] });
  const allYearsQuery = allYears.calls.find((call) => /SELECT DISTINCT hospcode/.test(call.sql));
  assert.doesNotMatch(allYearsQuery.sql, /WHERE/);
  assert.deepEqual(allYearsQuery.values, []);
});

test("scope names hospitals, filters by affiliation, and narrows the where clause to the hospcode", async () => {
  const scope = await scopeOf(fakeConn(), "hospcode=11111&affiliation=สสอ.");
  assert.equal(scope.badRequest, null);
  assert.deepEqual(scope.affiliations, ["รพ.", "สสอ."]);
  assert.deepEqual(scope.hospitals, [{ hospcode: "11111", hospname: "รพ.สต.หนึ่ง", affiliation: "สสอ." }]);
  assert.deepEqual(scope.hospitalOf("99999"), { hospname: "", affiliation: "" });
  assert.equal(scope.inAffiliation("11111"), true);
  assert.equal(scope.inAffiliation("22222"), false);
  assert.equal(scope.where, "fiscal_year = ? AND hospcode = ?");
  assert.deepEqual(scope.values, [2026, "11111"]);
});

test("scope rejects an unknown hospcode with 400 and the Thai message", async () => {
  const { badRequest } = await scopeOf(fakeConn(), "hospcode=99999");
  assert.equal(badRequest.status, 400);
  assert.deepEqual(await badRequest.json(), { error: "ไม่พบหน่วยบริการ" });
});

test("scope rejects a hospcode outside the chosen affiliation", async () => {
  const { badRequest } = await scopeOf(fakeConn(), "hospcode=22222&affiliation=สสอ.");
  assert.equal(badRequest.status, 400);
  assert.deepEqual(await badRequest.json(), { error: "หน่วยบริการไม่อยู่ในสังกัดที่เลือก" });
});

test("latestTransformAt reads the task's last finish and tolerates sites without log_transform", async () => {
  const finishedAt = new Date("2026-10-01T00:05:00Z");
  const conn = fakeConn({ transform: finishedAt });
  assert.equal(await latestTransformAt(conn, "t_report.sql"), finishedAt);
  assert.deepEqual(conn.calls[0].values, ["t_report.sql"]);
  assert.equal(await latestTransformAt(fakeConn(), "t_report.sql"), null);
  assert.equal(await latestTransformAt(fakeConn({ transform: new Error("ER_NO_SUCH_TABLE") }), "t_report.sql"), null);
});

function readSheet(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return { name: workbook.SheetNames[0], sheet, rows: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) };
}

test("xlsxResponse writes the header row, mapped values, and download headers", async () => {
  const columns = [["หน่วยบริการ", (row) => row.hospcode], ["จำนวน", (row) => row.count]];
  const response = xlsxResponse(columns, [{ hospcode: "11111", count: 3, cid: "secret" }], {
    sheet: "report_sheet",
    filename: "report_2026.xlsx",
    minColWidth: 14,
  });
  assert.match(response.headers.get("Content-Type"), /spreadsheetml\.sheet/);
  assert.equal(response.headers.get("Content-Disposition"), 'attachment; filename="report_2026.xlsx"');

  const { name, sheet, rows } = readSheet(Buffer.from(await response.arrayBuffer()));
  assert.equal(name, "report_sheet");
  assert.deepEqual(rows, [["หน่วยบริการ", "จำนวน"], ["11111", 3]]);
  assert.deepEqual(sheet["!cols"].map((col) => col.wch), [14, 14]);
});

test("xlsxResponse keeps the header row for an empty export", async () => {
  const response = xlsxResponse([["PID", (row) => row.pid]], [], { sheet: "x".repeat(40), filename: "empty.xlsx" });
  const { name, rows } = readSheet(Buffer.from(await response.arrayBuffer()));
  assert.equal(name.length, 31);
  assert.deepEqual(rows, [["PID"]]);
});

test("fetchReport reuses the report handler with extra params and passes failures through", async () => {
  const seen = [];
  const handler = async (request) => {
    seen.push(new URL(request.url));
    return Response.json({ rows: [1] });
  };
  const { data } = await fetchReport(handler, new Request("http://x/api/r/export?hospcode=1"), { details: "1" });
  assert.deepEqual(data, { rows: [1] });
  assert.equal(seen[0].pathname, "/api/r/export");
  assert.equal(seen[0].searchParams.get("hospcode"), "1");
  assert.equal(seen[0].searchParams.get("details"), "1");

  const failing = async () => Response.json({ error: "ไม่พบหน่วยบริการ" }, { status: 400 });
  const { failed } = await fetchReport(failing, new Request("http://x/api/r/export"));
  assert.equal(failed.status, 400);
  assert.deepEqual(await failed.json(), { error: "ไม่พบหน่วยบริการ" });
});

test("Thai dates convert F43 YYYYMMDD to Buddhist years and keep other values", () => {
  assert.equal(formatThaiDate("20251001"), "01/10/2568");
  assert.equal(formatThaiDate("", "-"), "-");
  assert.equal(formatThaiDate("2025-10"), "2025-10");
  assert.equal(formatThaiDateTime("202510011330"), "01/10/2568 13:30");
  assert.equal(formatThaiDateTime("20251001"), "01/10/2568");
  assert.equal(formatThaiDateTime(undefined, "-"), "-");
});
