import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RAPID_REPORTS, RAPID_REPORT_IDS, RAPID_MENU, RAPID_BREADCRUMB, currentThaiFiscalYear } from "../app/rapid/_lib/rapid-reports.mjs";

const indexSource = readFileSync(new URL("../app/rapid/index/page.js", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("../app/rapid/[id]/page.js", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/rapid/[id]/route.js", import.meta.url), "utf8");
const dataSource = readFileSync(new URL("../app/rapid/_lib/rapid-data.mjs", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../app/api/rapid/[id]/export/route.js", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");

test("rapid report config covers the four tracked KPIs", () => {
  assert.deepEqual([...RAPID_REPORT_IDS].sort(), ["143", "275", "276", "52"].sort());
  assert.equal(RAPID_REPORTS["143"].tableName, "s_dm_control");
  assert.equal(RAPID_REPORTS["275"].tableName, "s_dm_screen_risk");
  assert.equal(RAPID_REPORTS["276"].tableName, "s_ht_screen_risk");
  assert.equal(RAPID_REPORTS["52"].tableName, "s_epi2");
  // MMR2 รวม 12 เดือน (ต.ค.→ก.ย.)
  assert.equal(RAPID_REPORTS["52"].targetCols.length, 12);
  assert.equal(RAPID_REPORTS["52"].resultCols.length, 12);
  assert.ok(RAPID_REPORTS["52"].resultCols.every((col) => col.startsWith("mmr2_")));
});

test("currentThaiFiscalYear rolls over in October", () => {
  assert.equal(currentThaiFiscalYear(new Date("2026-07-12")), "2569");
  assert.equal(currentThaiFiscalYear(new Date("2026-10-01")), "2570");
});

test("rapid index links each bullet to /rapid/{id} with fixed labels", () => {
  assert.match(indexSource, /href=\{`\/rapid\/\$\{id\}`\}/);
  // เมนูมาจาก RAPID_MENU (label แบบ fix) ไม่ hardcode ในหน้า
  assert.match(indexSource, /RAPID_MENU/);
  assert.deepEqual([...RAPID_MENU.map((item) => item.id)].sort(), [...RAPID_REPORT_IDS].sort());
  for (const item of RAPID_MENU) assert.ok(item.title && item.title.length > 0);
});

test("rapid detail page shows the required datagrid columns live", () => {
  assert.match(detailSource, /useParams/);
  assert.match(detailSource, /\/api\/rapid\/\$\{id\}/);
  for (const label of ["หน่วยบริการ", "สังกัด", "เป้าหมาย", "ผลงาน", "ร้อยละ", "ส่วนขาด"]) {
    assert.match(detailSource, new RegExp(label));
  }
});

test("rapid data helper fetches live from HDC and aggregates by hospcode", () => {
  assert.match(dataSource, /report_data/);
  assert.match(dataSource, /getHospInfoMap/);
  assert.match(dataSource, /byHospcode/);
  assert.match(dataSource, /deficit/);
  // route + export ใช้ helper ตัวเดียวกัน
  assert.match(routeSource, /loadRapidReport/);
  assert.match(exportSource, /loadRapidReport/);
});

test("rapid detail can filter by affiliation (สังกัด)", () => {
  assert.match(dataSource, /c_hostype/);
  assert.match(dataSource, /affiliation/);
  // หน้า detail มี dropdown กรองสังกัด (default ทุกสังกัด) + filter รายสังกัด
  assert.match(detailSource, /ทุกสังกัด/);
  assert.match(detailSource, /row\.affiliation === affiliation/);
  // filter สังกัดใช้ query string (?aff=) เหมือน sort
  assert.match(detailSource, /searchParams\.get\("aff"\)/);
  assert.match(detailSource, /setParam\("aff"/);
});

test("all columns are sortable via query string", () => {
  assert.match(detailSource, /useSearchParams/);
  assert.match(detailSource, /searchParams\.get\("sort"\)/);
  assert.match(detailSource, /searchParams\.get\("dir"\)/);
  // คลิกหัวคอลัมน์อัปเดต query string ผ่าน router
  assert.match(detailSource, /router\.replace/);
  assert.match(detailSource, /params\.set\("sort"/);
  assert.match(detailSource, /params\.set\("dir"/);
  // ครบทุกคอลัมน์ที่แสดง
  for (const key of ["hospcode", "affiliation", "target", "result", "percent", "deficit"]) {
    assert.match(detailSource, new RegExp(`key: "${key}"`));
  }
});

test("deficit number is clickable and alerts about incomplete PERSON data", () => {
  assert.match(detailSource, /deficitDownload/);
  assert.match(detailSource, /downloadIndividual/);
  assert.match(detailSource, /import Swal from "sweetalert2"/);
  assert.match(detailSource, /ข้อมูล PERSON ในระบบ SUB-HDC ของหน่วยบริการนี้ยังไม่ครบ/);
});

test("rapid export produces xlsx respecting the affiliation filter", () => {
  assert.match(exportSource, /XLSX/);
  assert.match(exportSource, /affiliation/);
  assert.match(exportSource, /spreadsheetml\.sheet/);
  // ลิงก์ส่งออกบนหน้า detail ส่ง filter สังกัดไปด้วย
  assert.match(detailSource, /\/api\/rapid\/\$\{id\}\/export/);
  assert.match(detailSource, /exportXlsxLink/);
});

test("rapid fixes amphoe from .env AMP_CODE without a picker", () => {
  // helper อ่าน AMP_CODE จาก env แล้ว filter เฉพาะอำเภอนั้น
  assert.match(dataSource, /process\.env\.AMP_CODE/);
  assert.match(dataSource, /row\.ampCode === AMP_CODE/);
  // ไม่มี dropdown เลือกอำเภอบนหน้า detail แล้ว (fix จาก env — ไม่ใช่ตัวเลือกสังกัด)
  assert.doesNotMatch(detailSource, /ทุกอำเภอ/);
  assert.doesNotMatch(detailSource, /setAmphoe/);
  // แสดงชื่ออำเภอที่ fix ไว้
  assert.match(detailSource, /ampName/);
});

test("rapid owns its breadcrumb entry; ModuleHeader only imports it", () => {
  // module rapid เป็นเจ้าของ breadcrumb entry เอง (label + pages) ใน _lib
  assert.equal(RAPID_BREADCRUMB.prefix, "/rapid");
  assert.equal(RAPID_BREADCRUMB.href, "/rapid/index");
  for (const { id, title } of RAPID_MENU) {
    assert.equal(RAPID_BREADCRUMB.pages[`/rapid/${id}`], title);
  }
  // ModuleHeader แค่ import มาต่อ ไม่ถือ config ของ rapid เอง
  assert.match(headerSource, /RAPID_BREADCRUMB/);
  assert.doesNotMatch(headerSource, /งานเร่งรัดติดตาม/);
});
