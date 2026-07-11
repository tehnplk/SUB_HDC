import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../app/import-check/index/page.js", import.meta.url), "utf8");
const logImportSource = readFileSync(new URL("../app/import-check/log-import/page.js", import.meta.url), "utf8");
const filesCountSource = readFileSync(new URL("../app/import-check/files-count/page.js", import.meta.url), "utf8");
const compareHdcSource = readFileSync(new URL("../app/import-check/compare-hdc-person/page.js", import.meta.url), "utf8");
const compareHdcApiSource = readFileSync(new URL("../app/api/compare-hdc-person/route.js", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");

test("Import Check index offers the requested child modules", () => {
  assert.match(indexSource, /ประวัติการนำเข้า/);
  assert.match(indexSource, /จำนวนข้อมูลรายแฟ้ม/);
  assert.match(indexSource, /เปรียบเทียบประชากรกับ HDC/);
  assert.match(indexSource, /\/import-check\/log-import/);
  assert.match(indexSource, /\/import-check\/files-count/);
  assert.match(indexSource, /\/import-check\/compare-hdc-person/);
  assert.match(indexSource, /moduleTopicList/);
  assert.match(indexSource, /moduleTopicBullet/);
  assert.doesNotMatch(indexSource, /standardIntro|standardEyebrow|standardMenuCard|IMPORT CHECK/);
});

test("Import Check owns the canonical child routes", () => {
  assert.match(logImportSource, /dashboard\/log-import\/page/);
  assert.match(filesCountSource, /dashboard\/hos-list\/page/);
  assert.match(mainTabSource, /\/import-check\/index/);
  assert.doesNotMatch(mainTabSource, /dashboard\/log-import/);
  assert.doesNotMatch(mainTabSource, /dashboard\/hos-list/);
});

test("compare-hdc-person compares both sources per unit with red badges on short type1/3", () => {
  // group ละ 3 คอลัมน์: HDC / SUB-HDC / ส่วนต่าง ครบทั้ง type1-5
  assert.match(compareHdcSource, /"Type 1", "Type 2", "Type 3", "Type 4", "Type 5"/);
  assert.match(compareHdcSource, />HDC<\/th>/);
  assert.match(compareHdcSource, />SUB-HDC<\/th>/);
  assert.match(compareHdcSource, />ส่วนต่าง<\/th>/);
  // badge แดงเฉพาะ type1/type3 (index 0, 2) เมื่อ SUB-HDC น้อยกว่า
  assert.match(compareHdcSource, /ALERT_TYPE_INDEXES = new Set\(\[0, 2\]\)/);
  assert.match(compareHdcSource, /diffBadgeDanger/);
  assert.match(compareHdcSource, /function formatSignedNumber/);
  assert.match(compareHdcSource, /number > 0 \? `\+\$\{formatted\}`/);
  assert.match(compareHdcSource, /formatSignedNumber\(type\.diff\)/);
  assert.match(compareHdcSource, /compareTargetDiff/);
  assert.match(globalStyles, /\.compareHdcTable tbody \.numCol\s*\{\s*font-size:\s*11px;/);
  assert.match(globalStyles, /\.diffBadgeDanger\s*\{[\s\S]*?font-weight:\s*400;/);
  assert.doesNotMatch(globalStyles, /\.diffBadgeDanger\s*\{[\s\S]*?font-weight:\s*900;/);
  assert.match(compareHdcSource, /ModuleHeader/);
  assert.match(compareHdcSource, /hospNameShort/);
  assert.match(compareHdcSource, /\/api\/compare-hdc-person/);
  // API อ่านตารางสรุปทั้งสองแหล่ง ไม่แตะตารางดิบ
  assert.match(compareHdcApiSource, /hdc_api_s_persontype/);
  assert.match(compareHdcApiSource, /s_person_type_count/);
  assert.match(compareHdcApiSource, /getHospNameMap/);
  // แสดงเฉพาะหน่วยที่มีใน s_person_type_count — แถวหลักมาจาก subRows
  assert.match(compareHdcApiSource, /const rows = subRows/);
});

test("legacy dashboard routes permanently redirect to Import Check", () => {
  assert.match(nextConfig, /source: "\/dashboard\/log-import"[\s\S]*?destination: "\/import-check\/log-import"/);
  assert.match(nextConfig, /source: "\/dashboard\/hos-list"[\s\S]*?destination: "\/import-check\/files-count"/);
  assert.match(nextConfig, /source: "\/import-check\/hos-list"[\s\S]*?destination: "\/import-check\/files-count"/);
});
