import assert from "node:assert/strict";
import test from "node:test";
import { buildChartFromDbResult, MAX_AI_CHART_ROWS, userRequestedChart } from "../lib/ai-chart.mjs";

test("buildChartFromDbResult creates a bar chart from count rows", () => {
  const chart = buildChartFromDbResult({
    ok: true,
    columns: ["diagcode", "cnt"],
    rows: [
      { diagcode: "I10", cnt: 880 },
      { diagcode: "E119", cnt: "681" },
    ],
  });

  assert.equal(chart.type, "bar");
  assert.equal(chart.title, "Count by Diagnosis code");
  assert.equal(chart.labelField, "diagcode");
  assert.equal(chart.valueField, "cnt");
  assert.deepEqual(chart.rows, [
    { label: "I10", value: 880 },
    { label: "E119", value: 681 },
  ]);
});

test("buildChartFromDbResult uses requested chart type from the latest user prompt", () => {
  const result = {
    ok: true,
    columns: ["month", "visits"],
    rows: [
      { month: "2025-10", visits: 120 },
      { month: "2025-11", visits: 140 },
    ],
  };

  assert.equal(buildChartFromDbResult(result, [{ role: "user", content: "make line chart" }]).type, "line");
  assert.equal(buildChartFromDbResult(result, [{ role: "user", content: "make pie chart" }]).type, "pie");
  assert.equal(buildChartFromDbResult(result, [{ role: "user", content: "make radar chart" }]).type, "radar");
  assert.equal(buildChartFromDbResult(result, [{ role: "user", content: "make column chart" }]).type, "bar");
  assert.equal(buildChartFromDbResult(result, [{ role: "user", content: "make chart" }]).type, "bar");
});

test("buildChartFromDbResult creates multiline chart data from multiple numeric columns", () => {
  const chart = buildChartFromDbResult(
    {
      ok: true,
      columns: ["month", "opd", "ipd"],
      rows: [
        { month: "2025-10", opd: 120, ipd: 18 },
        { month: "2025-11", opd: 140, ipd: "22" },
      ],
    },
    [{ role: "user", content: "show multiline chart" }]
  );

  assert.equal(chart.type, "line");
  assert.deepEqual(chart.seriesFields, ["opd", "ipd"]);
  assert.deepEqual(chart.labels, ["2025-10", "2025-11"]);
  assert.deepEqual(chart.datasets, [
    { label: "Opd", values: [120, 140] },
    { label: "Ipd", values: [18, 22] },
  ]);
});

test("buildChartFromDbResult caps rows for compact chat rendering", () => {
  const rows = Array.from({ length: MAX_AI_CHART_ROWS + 4 }, (_, index) => ({
    label: `item-${index}`,
    total: index + 1,
  }));

  const chart = buildChartFromDbResult({
    ok: true,
    columns: ["label", "total"],
    rows,
  });

  assert.equal(chart.rows.length, MAX_AI_CHART_ROWS);
});

test("buildChartFromDbResult ignores failed or non-numeric results", () => {
  assert.equal(buildChartFromDbResult({ ok: false, rows: [{ code: "A", cnt: 1 }] }), null);
  assert.equal(
    buildChartFromDbResult({
      ok: true,
      columns: ["code", "name"],
      rows: [{ code: "A", name: "Alpha" }],
    }),
    null
  );
  assert.equal(
    buildChartFromDbResult({
      ok: true,
      columns: ["code", "cnt"],
      rows: [{ code: "A", cnt: 1 }],
    }),
    null
  );
});

test("userRequestedChart only enables charts for explicit chart requests", () => {
  assert.equal(userRequestedChart([{ role: "user", content: "โรคที่พบมากสุด 10 อันดับ ปี 2569" }]), false);
  assert.equal(userRequestedChart([{ role: "user", content: "show chart โรคที่พบมากสุด 10 อันดับ ปี 2569" }]), true);
  assert.equal(userRequestedChart([{ role: "user", content: "แสดงกราฟ โรคที่พบมากสุด 10 อันดับ ปี 2569" }]), true);
  assert.equal(userRequestedChart([{ role: "user", content: "make radar chart" }]), true);
  assert.equal(userRequestedChart([{ role: "user", content: "show multiline chart" }]), true);
  assert.equal(userRequestedChart([{ role: "user", content: "show column จำนวน visit แยกรายเดือน" }]), true);
  assert.equal(userRequestedChart([{ role: "user", content: "show table only, no chart" }]), false);
});

test("formatChartLabel converts period keys to Thai month + Buddhist year like the table", async () => {
  const { formatChartLabel } = await import("../lib/ai-chart.mjs");
  assert.equal(formatChartLabel("202610"), "ต.ค. 2569");
  assert.equal(formatChartLabel("202601"), "ม.ค. 2569");
  assert.equal(formatChartLabel("20251001"), "1 ต.ค. 2568");
  // non-period values pass through unchanged
  assert.equal(formatChartLabel("E11.9"), "E11.9");
  assert.equal(formatChartLabel("รพ.สต.วัดจันทร์"), "รพ.สต.วัดจันทร์");
  // 6 digits with invalid month is not a period
  assert.equal(formatChartLabel("202613"), "202613");
});

test("buildChartFromDbResult renders YYYYMM labels as Thai month-year", async () => {
  const { buildChartFromDbResult } = await import("../lib/ai-chart.mjs");
  const chart = buildChartFromDbResult(
    {
      ok: true,
      columns: ["ym", "cnt"],
      rows: [
        { ym: "202610", cnt: 100 },
        { ym: "202611", cnt: 200 },
      ],
    },
    [{ role: "user", content: "ขอกราฟ" }]
  );
  assert.deepEqual(chart.labels, ["ต.ค. 2569", "พ.ย. 2569"]);
});

test("multi-series chart excludes period/sort key columns from datasets", async () => {
  const { buildChartFromDbResult } = await import("../lib/ai-chart.mjs");
  const chart = buildChartFromDbResult(
    {
      ok: true,
      columns: ["month_name", "month_sort", "total_persons", "total_visits"],
      rows: [
        { month_name: "ต.ค. 68", month_sort: 202510, total_persons: 100, total_visits: 150 },
        { month_name: "พ.ย. 68", month_sort: 202511, total_persons: 200, total_visits: 250 },
      ],
    },
    [{ role: "user", content: "กราฟเส้นหลายเส้น" }]
  );
  assert.deepEqual(chart.seriesFields, ["total_persons", "total_visits"]);
  assert.deepEqual(chart.labels, ["ต.ค. 68", "พ.ย. 68"]);
});
