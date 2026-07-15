import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/workload/visit-monthly/page.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../app/api/visit-monthly-workload/route.js", import.meta.url), "utf8");

test("monthly visit workload provides year, affiliation, and hospital filters", () => {
  assert.match(pageSource, /\/api\/visit-monthly-workload/);
  assert.match(pageSource, /ทุกสังกัด/);
  assert.match(pageSource, /ทุกหน่วยบริการ/);
  assert.match(pageSource, /params\.set\("affiliation", affiliation\)/);
  assert.match(pageSource, /setHospcode\(""\)/);
});

test("monthly visit workload reads the summary table and filters safely", () => {
  assert.match(apiSource, /s_visit_monthly/);
  assert.match(apiSource, /fiscal_year = \?/);
  assert.match(apiSource, /hospcode = \?/);
  assert.match(apiSource, /getHospInfoMap/);
  assert.match(apiSource, /row\.affiliation === requestedAffiliation/);
  assert.match(apiSource, /rows\.reduce/);
});
