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

test("SERVICE entitlement-error report supports affiliation and hospital filters", async () => {
  const [page, route] = await Promise.all([
    readFile(path.join(root, "app", "quality", "service-instype-err", "page.js"), "utf8"),
    readFile(path.join(root, "app", "api", "quality", "service-instype-err", "route.js"), "utf8"),
  ]);

  assert.match(page, /<AffiliationFilter/);
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
  assert.match(route, /FROM `t_service_intype_error`/);
  assert.match(route, /requireApiJwt/);
});
