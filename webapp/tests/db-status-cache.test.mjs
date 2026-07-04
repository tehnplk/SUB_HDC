import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const cacheModuleUrl = new URL("../lib/db-status-cache.mjs", import.meta.url);
const routeUrl = new URL("../app/api/db-status/route.js", import.meta.url);
const titleSource = readFileSync(new URL("../components/dashboard-page-title.jsx", import.meta.url), "utf8");

test("db status cache shares one in-flight request and cached result", async () => {
  assert.equal(existsSync(cacheModuleUrl), true);

  const { getDbStatusOnce, resetDbStatusCache } = await import(cacheModuleUrl);
  resetDbStatusCache();

  let calls = 0;
  const payload = { status: "online", centerName: "เมือง" };
  const fetcher = async (url) => {
    calls += 1;
    assert.equal(url, "/api/db-status");
    return {
      ok: true,
      json: async () => payload,
    };
  };

  const [first, second] = await Promise.all([
    getDbStatusOnce(fetcher),
    getDbStatusOnce(fetcher),
  ]);
  const third = await getDbStatusOnce(fetcher);

  assert.equal(calls, 1);
  assert.equal(first, payload);
  assert.equal(second, payload);
  assert.equal(third, payload);
});

test("db status route only checks database connection", () => {
  assert.equal(existsSync(routeUrl), true);

  const routeSource = readFileSync(routeUrl, "utf8");
  assert.match(routeSource, /import \{ createDbConnection \} from "@\/lib\/db"/);
  assert.match(routeSource, /conn\.query\("SELECT 1"\)/);
  assert.match(routeSource, /status:\s*"online"/);
  assert.match(routeSource, /status:\s*"error"/);
  assert.match(routeSource, /centerName:\s*process\.env\.CENTER_NAME/);
  assert.doesNotMatch(routeSource, /status:\s*503/);
  assert.doesNotMatch(routeSource, /c_file/);
  assert.doesNotMatch(routeSource, /information_schema/);
  assert.doesNotMatch(routeSource, /COUNT\(/i);
});

test("dashboard title uses cached db status instead of dashboard summary", () => {
  assert.match(titleSource, /import \{ getDbStatusOnce \} from "\.\.\/lib\/db-status-cache\.mjs"/);
  assert.match(titleSource, /getDbStatusOnce\(\)/);
  assert.match(titleSource, /setCenterName\(payload\.centerName \|\| ""\)/);
  assert.doesNotMatch(titleSource, /getDashboardSummaryOnce/);
  assert.doesNotMatch(titleSource, /\/api\/dashboard\?summary=true/);
});
