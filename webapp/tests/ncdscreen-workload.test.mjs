import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../app/import-check/index/page.js", import.meta.url), "utf8");
const portalSource = readFileSync(new URL("../app/workload/page.js", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/workload/ncdscreen-workload/page.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../app/api/ncdscreen-workload/route.js", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../app/api/ncdscreen-workload/export/route.js", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("NCD screening workload belongs to the Work Load portal, not Import Check", () => {
  assert.doesNotMatch(indexSource, /ncdscreen-workload/);
  assert.match(portalSource, /\/workload\/ncdscreen-workload/);
  assert.match(portalSource, /การคัดกรองเบาหวานความดัน/);
  assert.match(mainTabSource, /\{ href: "\/workload", label: "Work Load"/);
  assert.ok(mainTabSource.indexOf('href: "/workload"') > mainTabSource.indexOf('href: "/target-group/index"'));
  assert.match(headerSource, /"\/workload\/ncdscreen-workload": "การคัดกรองเบาหวานความดัน"/);
});

test("NCD screening workload page provides filters, workload tab, and total trend", () => {
  assert.match(pageSource, /\/api\/ncdscreen-workload/);
  assert.match(pageSource, /ปีงบประมาณ/);
  assert.match(pageSource, /<AffiliationFilter/);
  assert.match(pageSource, /params\.set\("affiliation", affiliation\)/);
  assert.match(pageSource, /หน่วยบริการ/);
  assert.match(pageSource, /ผลงาน/);
  assert.match(pageSource, /แนวโน้ม/);
  assert.match(pageSource, /function TrendLine/);
  assert.match(pageSource, /เบาหวาน \+ ความดัน/);
  assert.match(pageSource, /workloadDatagridActions/);
  assert.match(pageSource, /\/api\/ncdscreen-workload\/export/);
  assert.match(pageSource, /FileSpreadsheet/);
  assert.match(styles, /\.ncdWorkloadHero/);
  assert.match(styles, /\.ncdTrendLine/);
});

test("NCD workload exports the active filtered datagrid as xlsx", () => {
  assert.match(exportSource, /requireExcelExportAccess/);
  assert.match(exportSource, /getNcdWorkload/);
  assert.match(exportSource, /metric.*ht.*ht.*dm/);
  assert.match(exportSource, /XLSX\.utils\.aoa_to_sheet/);
  assert.match(exportSource, /Content-Disposition/);
});

test("NCD screening workload API reads the Typearea 1/3 summary and filters safely", () => {
  assert.match(apiSource, /s_dm_screen/);
  assert.match(apiSource, /s_ht_screen/);
  assert.match(apiSource, /fiscal_year = \?/);
  assert.match(apiSource, /hospcode = \?/);
  assert.match(apiSource, /requestedAffiliation/);
  assert.match(apiSource, /getHospInfoMap/);
  assert.match(apiSource, /row\.affiliation === requestedAffiliation/);
  assert.match(apiSource, /getHospNameMap/);
  assert.match(apiSource, /FISCAL_MONTHS/);
  assert.match(pageSource, /setTab\("dm"\)/);
  assert.match(pageSource, /setTab\("ht"\)/);
  assert.match(pageSource, /setTab\("trend"\)/);
});
