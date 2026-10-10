import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("quality portal links to the SERVICE entitlement-error report", async () => {
  const page = await readFile(path.join(root, "app", "dashboard", "quality", "page.js"), "utf8");
  assert.match(page, /href="\/quality\/service-instype-err"/);
  assert.match(page, /รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ \(SERVICE - INSTYPE\)/);
});

test("SERVICE entitlement-error report groups counts by hospital and opens individual details", async () => {
  const [page, route] = await Promise.all([
    readFile(path.join(root, "app", "quality", "service-instype-err", "page.js"), "utf8"),
    readFile(path.join(root, "app", "api", "quality", "service-instype-err", "route.js"), "utf8"),
  ]);

  assert.match(page, /<AffiliationFilter/);
  assert.match(page, /filterGrid qualityFilters/);
  assert.match(page, /params\.set\("fiscalYear", fiscalYear\)/);
  assert.match(page, /<FiscalYearFilter/);
  assert.match(page, /onChange=\{\(year\) => \{ setFiscalYear\(year\); setAffiliation\(""\); setHospcode\(""\); \}\}/);
  assert.match(page, /if \(!fiscalYear && payload\.fiscalYear\) setFiscalYear\(String\(payload\.fiscalYear\)\)/);
  assert.match(page, /params\.set\("hospcode", hospcode\)/);
  // ปีงบ/หน่วยบริการ/สังกัด ตรวจใน resolveReportScope (ดู report.test.mjs)
  assert.match(route, /tables: \["t_service_intype_error"\]/);
  assert.match(route, /hospitalsPerYear: true/);
  assert.match(route, /affiliationSource: "depShort"/);
  assert.match(route, /if \(scope\.badRequest\) return scope\.badRequest/);
  assert.match(route, /searchParams\.get\("details"\) === "1"/);
  assert.match(route, /COUNT\(\*\) AS count/);
  assert.match(route, /GROUP BY hospcode/);
  assert.match(route, /FROM \\`t_service_intype_error\\`/);
  assert.match(page, /tableCountButton/);
  assert.match(page, /openDetails/);
  assert.match(page, /reportModalBackdrop/);
  assert.match(page, /dataSourceLabel/);
  assert.match(page, /ExcelExportButton/);
  assert.match(page, /exportHrefFor\(row\.hospcode\)/);
  assert.match(page, /serviceInstypeErrorTable/);
  assert.match(page, /serviceInstypeActionCol/);
  assert.match(page, /t_service_intype_error/);
  assert.match(page, /processedAt/);
  assert.match(route, /latestTransformAt\(conn, "t_service_intype_error\.sql"\)/);
  assert.match(route, /transformedAt/);
});

test("SERVICE entitlement-error export reuses the filtered details of the report handler", async () => {
  const [route, exportRoute] = await Promise.all([
    readFile(path.join(root, "app", "api", "quality", "service-instype-err", "route.js"), "utf8"),
    readFile(path.join(root, "app", "api", "quality", "service-instype-err", "export", "route.js"), "utf8"),
  ]);
  assert.match(exportRoute, /fetchReport\(getServiceInstypeError, request, \{ details: "1" \}\)/);
  assert.match(route, /if \(!scope\.hospcode\)/);
  assert.match(exportRoute, /SORT_KEYS = \["hospcode", "date_serve", "pid", "seq"\]/);
  assert.match(exportRoute, /xlsxResponse\(COLUMNS, rows/);
  assert.match(exportRoute, /service_instype_error_\$\{data\.fiscalYear\}_\$\{hospcode\}\.xlsx/);
  assert.doesNotMatch(exportRoute, /\bcid\b/);
});
