import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("quality portal links to the SERVICE entitlement-error report", async () => {
  const page = await readFile(path.join(root, "app", "dashboard", "quality", "page.js"), "utf8");
  assert.match(page, /href="\/quality\/service-instype-err"/);
  assert.match(page, /รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ/);
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
  assert.match(route, /getHospInfoMap\(conn, \{ affiliationSource: "depShort" \}\)/);
  assert.match(route, /SELECT DISTINCT fiscal_year FROM `t_service_intype_error` ORDER BY fiscal_year DESC/);
  assert.match(route, /const where = \["fiscal_year = \?"\]/);
  assert.match(route, /searchParams\.get\("affiliation"\)/);
  assert.match(route, /searchParams\.get\("hospcode"\)/);
  assert.match(route, /searchParams\.get\("details"\) === "1"/);
  assert.match(route, /COUNT\(\*\) AS count/);
  assert.match(route, /GROUP BY hospcode/);
  assert.match(route, /FROM `t_service_intype_error`/);
  assert.match(route, /requireApiJwt/);
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
  assert.match(route, /transform_sql_task = 't_service_intype_error\.sql'/);
  assert.match(route, /transformedAt/);
});

test("SERVICE entitlement-error export preserves active filters and requires Excel export access", async () => {
  const route = await readFile(path.join(root, "app", "api", "quality", "service-instype-err", "export", "route.js"), "utf8");
  assert.match(route, /requireApiJwt/);
  assert.match(route, /requireExcelExportAccess/);
  assert.match(route, /searchParams\.get\("fiscalYear"\)/);
  assert.match(route, /searchParams\.get\("affiliation"\)/);
  assert.match(route, /searchParams\.get\("hospcode"\)/);
  assert.match(route, /if \(!requestedHospcode\)/);
  assert.match(route, /FROM `t_service_intype_error`/);
  assert.match(route, /Content-Disposition/);
});
