import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const apiSource = readFileSync(new URL("../app/api/person-target/route.js", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/dashboard/person-target/page.js", import.meta.url), "utf8");

test("person target API reads the transform summary and derives Typearea 1 + 3", () => {
  assert.match(apiSource, /s_person_type_count/);
  assert.match(apiSource, /targetPopulation: type1 \+ type3/);
  assert.match(apiSource, /getHospNameMap/);
});

test("person target dashboard shows unit-level Typearea columns", () => {
  assert.match(pageSource, /fetch\("\/api\/person-target"/);
  assert.match(pageSource, /Typearea 1 \+ 3/);
  assert.match(pageSource, /HospitalFilter/);
  assert.match(pageSource, /selectedHospcode/);
  assert.doesNotMatch(pageSource, /personTargetRefresh|RefreshCw|refreshing/);
  assert.match(pageSource, /เป้าหมาย/);
  assert.match(pageSource, /หน่วยบริการ/);
  assert.doesNotMatch(pageSource, /personTargetHero/);
});
