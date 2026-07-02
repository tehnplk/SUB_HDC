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
  assert.equal(userRequestedChart([{ role: "user", content: "show table only, no chart" }]), false);
});
