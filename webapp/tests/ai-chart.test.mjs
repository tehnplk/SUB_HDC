import assert from "node:assert/strict";
import test from "node:test";
import { buildChartFromDbResult, MAX_AI_CHART_ROWS } from "../lib/ai-chart.mjs";

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
