import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("../app/api/report/route.js", import.meta.url), "utf8");

test("report API exposes PATCH for updating report name and sql", () => {
  assert.match(routeSource, /export\s+async\s+function\s+PATCH\s*\(/);
  assert.match(routeSource, /UPDATE report SET name = \?, `sql` = \?, date_update = NOW\(\) WHERE id = \?/);
  assert.match(routeSource, /normalizeReportSql\(sql\)/);
  assert.match(routeSource, /return Response\.json\(\{\s*report:/s);
});

test("report API exposes PUT for creating report name and sql", () => {
  assert.match(routeSource, /export\s+async\s+function\s+PUT\s*\(/);
  assert.match(routeSource, /INSERT INTO report \(name, `sql`\) VALUES \(\?, \?\)/);
  assert.match(routeSource, /normalizeReportSql\(body\?\.sql\)/);
  assert.match(routeSource, /result\.insertId/);
});

test("report API exposes DELETE for deleting a report by id", () => {
  assert.match(routeSource, /export\s+async\s+function\s+DELETE\s*\(/);
  assert.match(routeSource, /DELETE FROM report WHERE id = \?/);
  assert.match(routeSource, /return Response\.json\(\{\s*deleted:\s*true,\s*id\s*\}\)/s);
});
