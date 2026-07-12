import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../app/api/quality/person-dup/route.js", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/quality/person-dup/page.js", import.meta.url), "utf8");
const qualitySource = readFileSync(new URL("../app/dashboard/quality/page.js", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");

test("person-dup API reads the transform summary, not raw person, and never exposes cid", () => {
  assert.match(apiSource, /t_person_type_1_3/);
  assert.match(apiSource, /hos LIKE '%,%'/);
  assert.doesNotMatch(apiSource, /FROM `?person`?/);
  // groupId แทน cid — ไม่ส่งเลขบัตร (cid) ออกไปฝั่ง client
  assert.match(apiSource, /groupId/);
  assert.doesNotMatch(apiSource, /cid:/);
});

test("person-dup page shows the required columns with a hospcode filter and no visible label", () => {
  assert.match(pageSource, /ModuleHeader/);
  assert.match(pageSource, /\/api\/quality\/person-dup/);
  assert.match(pageSource, /srOnly/);
  for (const header of ["ชื่อ", "วันเกิด", "เพศ", "หน่วยบริการ", "PID", "TYPE", "ปรับปรุงล่าสุด"]) {
    assert.match(pageSource, new RegExp(header));
  }
  assert.match(pageSource, /selectedHospcode/);
  assert.match(pageSource, /hospNameShort/);
});

test("quality dashboard exposes a clickable card that links to the person-dup page", () => {
  assert.match(qualitySource, /href="\/quality\/person-dup"/);
  assert.match(qualitySource, /ประชากร TYPE 1 และ 3 ซ้ำกัน/);
});

test("quality navigation stays active and breadcrumbed across the person-dup child route", () => {
  assert.match(mainTabSource, /pathname\.startsWith\("\/quality\/"\)/);
  assert.match(headerSource, /"\/quality\/person-dup":/);
});
