import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildPayload, isDue, loadScheduledKpis, postKpiResult } = require("../jobs/post_sync_kpi.js");

test("isDue follows the interval_minute slot", () => {
  const minute30 = Date.UTC(2026, 6, 10, 6, 30, 0);
  assert.equal(isDue(15, minute30), true);
  assert.equal(isDue(20, minute30), false);
  assert.equal(isDue(null, minute30), false);
  assert.equal(isDue(0, minute30), false);
});

test("loadScheduledKpis reads only active rows with positive intervals", async () => {
  const connection = {
    async execute(sql) {
      assert.match(sql, /FROM sql_for_sync_data/i);
      assert.match(sql, /is_active = 1/i);
      assert.match(sql, /interval_minute > 0/i);
      return [[{ id: 3, interval_minute: 15 }]];
    },
  };

  assert.deepEqual(await loadScheduledKpis(connection), [{ id: 3, interval_minute: 15 }]);
});

test("postKpiResult posts rows with the KPI topic to endpoint-post", async () => {
  process.env.CENTER_NAME = "DEV-TEST";
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201, async text() { return '{"success":true}'; } };
  };
  const kpi = { id: 7, kpi_name: "MMR2", topic: "vaccination" };
  const rows = [{ hospcode: "06501", total: 10 }];

  await postKpiResult(kpi, rows, fetchImpl);

  assert.equal(request.url, "https://subhdc.plkhealth.go.th/api/data-sync-in");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), buildPayload(kpi, rows));
  assert.equal(JSON.parse(request.options.body).topic, "vaccination");
});
