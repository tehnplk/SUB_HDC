import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/workload/visit-monthly/page.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../app/api/visit-monthly-workload/route.js", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../app/api/visit-monthly-workload/export/route.js", import.meta.url), "utf8");

test("visit workload provides year, affiliation, and hospital filters", () => {
  assert.match(pageSource, /\/api\/visit-monthly-workload/);
  assert.match(pageSource, /<AffiliationFilter/);
  assert.match(pageSource, /ทุกหน่วยบริการ/);
  assert.match(pageSource, /params\.set\("affiliation", affiliation\)/);
  assert.match(pageSource, /setHospcode\(""\)/);
  assert.match(pageSource, /workloadDatagridActions/);
  assert.match(pageSource, /\/api\/visit-monthly-workload\/export/);
  assert.match(pageSource, /FileSpreadsheet/);
});

test("visit workload exports the filtered datagrid as xlsx", () => {
  assert.match(exportSource, /getVisitWorkload/);
  assert.match(exportSource, /fetchReport\(getVisitWorkload, request\)/);
  assert.match(exportSource, /xlsxResponse\(columns/);
  assert.match(exportSource, /visitPerson/);
  assert.match(exportSource, /visitCount/);
  assert.match(exportSource, /visit_workload_\$\{data\.fiscalYear \|\| "all"\}\.xlsx/);
});

test("visit workload reads s_visit and filters safely", () => {
  assert.match(apiSource, /FROM \\`s_visit\\`/);
  assert.match(apiSource, /resolveReportScope\(conn, .*\{ tables: \["s_visit"\] \}\)/);
  assert.match(apiSource, /WHERE \$\{scope\.where\}/);
  assert.match(apiSource, /visit_person/);
  assert.match(apiSource, /visit_count/);
  assert.match(apiSource, /scope\.inAffiliation\(rawRow\.hospcode\)/);
  assert.match(pageSource, />คน<\/th>/);
  assert.match(pageSource, />ครั้ง<\/th>/);
  assert.match(pageSource, /visitPerson/);
  assert.match(pageSource, /visitCount/);
});
