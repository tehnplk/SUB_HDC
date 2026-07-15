import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/workload/visit-monthly/page.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../app/api/visit-monthly-workload/route.js", import.meta.url), "utf8");

test("visit workload provides year, affiliation, and hospital filters", () => {
  assert.match(pageSource, /\/api\/visit-monthly-workload/);
  assert.match(pageSource, /ทุกสังกัด/);
  assert.match(pageSource, /ทุกหน่วยบริการ/);
  assert.match(pageSource, /params\.set\("affiliation", affiliation\)/);
  assert.match(pageSource, /setHospcode\(""\)/);
});

test("visit workload reads s_visit and filters safely", () => {
  assert.match(apiSource, /FROM \\`s_visit\\`/);
  assert.match(apiSource, /fiscal_year = \?/);
  assert.match(apiSource, /hospcode = \?/);
  assert.match(apiSource, /visit_person/);
  assert.match(apiSource, /visit_count/);
  assert.match(apiSource, /getHospInfoMap/);
  assert.match(apiSource, /info\.affiliation !== requestedAffiliation/);
  assert.match(pageSource, />คน<\/th>/);
  assert.match(pageSource, />ครั้ง<\/th>/);
  assert.match(pageSource, /visitPerson/);
  assert.match(pageSource, /visitCount/);
});
