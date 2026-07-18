import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../app/api/quality/person-dup/route.js", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../app/api/quality/person-dup/export/route.js", import.meta.url), "utf8");
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
  for (const field of ["age_y_fiscal", "age_m_fiscal", "age_d_fiscal", "age_y_current", "age_m_current", "age_d_current"]) {
    assert.match(apiSource, new RegExp(field));
  }
});

test("person-dup export requires login, requires hospcode, redirects browser links to /error/msg, and omits cid", () => {
  assert.match(exportSource, /requireApiJwt/);
  assert.match(exportSource, /\/error\/msg\?msg=/);
  assert.match(exportSource, /t_person_type_1_3/);
  // ไม่ส่งออกคอลัมน์ cid (ordering by cid ยังทำได้ แต่ห้ามเป็น key/header ผลลัพธ์)
  assert.doesNotMatch(exportSource, /["']cid["']/);
  // บังคับต้องกรองหน่วยบริการก่อนจึงส่งออกได้ (ทั้งฝั่ง UI และ API)
  assert.match(exportSource, /if \(!hospcode\)/);
  assert.match(exportSource, /กรุณาเลือกหน่วยบริการก่อนส่งออก/);
  assert.match(exportSource, /FIND_IN_SET\(\?, hos\)/);
  assert.match(exportSource, /อายุ ณ วันเริ่มปีงบประมาณ/);
  assert.match(exportSource, /อายุปัจจุบัน/);
});

test("person-dup page has an xlsx export link that only enables once a hospcode is selected", () => {
  assert.match(pageSource, /exportXlsxLink/);
  assert.match(pageSource, /FileSpreadsheet/);
  assert.match(pageSource, /\/api\/quality\/person-dup\/export/);
  assert.match(pageSource, /href=\{selectedHospcode \? `\/api\/quality\/person-dup\/export\?hospcode=/);
  assert.match(pageSource, /disabled=\{!selectedHospcode\}/);
});

test("person-dup page shows the required columns with a hospcode filter and no visible label", () => {
  assert.match(pageSource, /ModuleHeader/);
  assert.match(pageSource, /\/api\/quality\/person-dup/);
  assert.match(pageSource, /srOnly/);
  for (const header of ["ชื่อ", "วันเกิด", "เพศ", "หน่วยบริการ", "PID", "TYPE", "ปรับปรุงล่าสุด"]) {
    assert.match(pageSource, new RegExp(header));
  }
  for (const header of ["อายุ ณ วันเริ่มปีงบประมาณ", "อายุปัจจุบัน"]) {
    assert.match(pageSource, new RegExp(header));
  }
  assert.match(pageSource, /selectedHospcode/);
  assert.match(pageSource, /hospNameShort/);
  assert.match(pageSource, /filterGrid qualityFilters/);
  assert.match(pageSource, /dataSourceLabel/);
  assert.match(pageSource, /t_person_type_1_3/);
  assert.match(pageSource, /processedAt/);
});

test("person-dup page filters complete duplicate groups by their TYPE combination", () => {
  assert.match(pageSource, /selectedDuplicateType/);
  assert.match(pageSource, /duplicateType\(person\) === selectedDuplicateType/);
  for (const option of ["ซ้ำ TYPE 1-1", "ซ้ำ TYPE 1-3", "ซ้ำ TYPE 3-3"]) {
    assert.match(pageSource, new RegExp(option));
  }
});

test("quality dashboard exposes a clickable card that links to the person-dup page", () => {
  assert.match(qualitySource, /href="\/quality\/person-dup"/);
  assert.match(qualitySource, /ประเภทการอยู่อาศัยซ้ำกันข้ามหน่วยบริการ \(PERSON - TYPEAREA\)/);
});

test("quality navigation stays active and breadcrumbed across the person-dup child route", () => {
  assert.match(mainTabSource, /pathname\.startsWith\("\/quality\/"\)/);
  assert.match(headerSource, /"\/quality\/person-dup":/);
  assert.match(headerSource, /ประเภทการอยู่อาศัยซ้ำกันข้ามหน่วยบริการ \(PERSON - TYPEAREA\)/);
});
