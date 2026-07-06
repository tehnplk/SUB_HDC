import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReportQuery,
  getReportResultSet,
  normalizeReportRows,
  normalizeReportSql,
} from "../lib/report-sql.mjs";

test("report SQL allows SET user variables before the final SELECT", () => {
  const sql = normalizeReportSql(`
    SET @start_date := '20260101';
    SET @end_date = '20260131';
    SELECT @start_date AS start_date, @end_date AS end_date
  `);

  assert.equal(
    sql,
    "SET @start_date := '20260101';\nSET @end_date = '20260131';\nSELECT @start_date AS start_date, @end_date AS end_date"
  );
  assert.equal(
    buildReportQuery(sql),
    "SET @start_date := '20260101';\nSET @end_date = '20260131';\nSELECT * FROM (SELECT @start_date AS start_date, @end_date AS end_date) AS report_result LIMIT 500"
  );
});

test("report SQL still rejects write statements", () => {
  assert.throws(
    () => normalizeReportSql("SET @id := 1; UPDATE person SET hospcode = 'x'; SELECT @id AS id"),
    /Report SQL must be read-only/
  );
});

test("report SQL ignores semicolons inside strings when splitting statements", () => {
  const sql = normalizeReportSql("SET @label := 'A;B'; SELECT @label AS label");

  assert.equal(sql, "SET @label := 'A;B';\nSELECT @label AS label");
});

test("report SQL allows SET statements before a commented CTE SELECT", () => {
  const sql = normalizeReportSql(`
    SET @ds1='20251001', @ds2='20260930';
    -- monthly report
    WITH monthly_services AS (
      SELECT @ds1 AS start_date, @ds2 AS end_date
    )
    SELECT start_date, end_date FROM monthly_services
  `);

  assert.match(sql, /^SET @ds1='20251001', @ds2='20260930';\n-- monthly report\s+WITH monthly_services/s);
  assert.match(buildReportQuery(sql), /SELECT \* FROM \(\s*-- monthly report\s*WITH monthly_services/s);
});

test("report rows convert binary Buffer cells to utf8 strings", () => {
  const rows = normalizeReportRows([
    {
      "รพ.สต.": "07478",
      "พ.ค.": Buffer.from("1990/1 [1990.00]", "utf8"),
      "มิ.ย.": null,
      total: 5,
    },
  ]);

  assert.deepEqual(rows, [
    {
      "รพ.สต.": "07478",
      "พ.ค.": "1990/1 [1990.00]",
      "มิ.ย.": null,
      total: 5,
    },
  ]);
});

test("report result helper returns the last statement rows and fields", () => {
  const rows = [{ affectedRows: 0 }, [{ total: 1 }]];
  const fields = [undefined, [{ name: "total" }]];

  assert.deepEqual(getReportResultSet(rows, fields), {
    rows: [{ total: 1 }],
    fields: [{ name: "total" }],
  });
});
