import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RAPID_REPORTS, RAPID_REPORT_IDS, RAPID_MENU, RAPID_BREADCRUMB, currentThaiFiscalYear } from "../app/rapid/_lib/rapid-reports.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const indexSource = read("../app/rapid/index/page.js");
const dmControlSource = read("../app/rapid/dm-control/page.js");
const mmr2Source = read("../app/rapid/mmr2/page.js");
const screenHtSource = read("../app/rapid/screen-ht/page.js");
const screenDmSource = read("../app/rapid/screen-dm/page.js");
const hookSource = read("../app/rapid/_lib/use-rapid-report.js");
const sortSource = read("../app/rapid/_lib/rapid-sort.jsx");
const dataSource = read("../app/rapid/_lib/rapid-data.mjs");
const routeSource = read("../app/api/rapid/[id]/route.js");
const hdcReportMetaSource = read("../app/rapid/_components/rapid-hdc-report-meta.jsx");
const exportSource = read("../app/api/rapid/[id]/export/route.js");
const headerSource = read("../components/module-header.jsx");
const nextConfigSource = read("../next.config.mjs");

const screenPages = [screenHtSource, screenDmSource];
const allPages = [dmControlSource, mmr2Source, screenHtSource, screenDmSource];

test("rapid report config covers the four tracked KPIs", () => {
  assert.deepEqual([...RAPID_REPORT_IDS].sort(), ["143", "275", "276", "52"].sort());
  assert.equal(RAPID_REPORTS["143"].tableName, "s_dm_control");
  assert.deepEqual(RAPID_REPORTS["143"].resultCols, ["result"]);
  assert.deepEqual(RAPID_REPORTS["143"].controlCols, ["hba1c"]);
  assert.equal(RAPID_REPORTS["143"].targetLabel, "ผู้ป่วย DM");
  assert.equal(RAPID_REPORTS["143"].resultLabel, "คุมน้ำตาลได้ดี");
  assert.equal(RAPID_REPORTS["143"].controlLabel, "ได้รับการตรวจ");
  assert.equal(RAPID_REPORTS["275"].tableName, "s_dm_screen_risk");
  assert.equal(RAPID_REPORTS["276"].tableName, "s_ht_screen_risk");
  assert.deepEqual(RAPID_REPORTS["275"].breakdownCols.map(({ key }) => key), ["normal", "risk", "high_risk", "ill"]);
  assert.notEqual(RAPID_REPORTS["276"].showBreakdownPercent, true);
  assert.deepEqual(RAPID_REPORTS["276"].breakdownCols.map(({ key }) => key), ["normal", "risk", "high_risk", "ill", "ill_1"]);
  assert.equal(RAPID_REPORTS["276"].breakdownCols.find(({ key }) => key === "ill_1").label, "นอกเกณฑ์");
  assert.equal(RAPID_REPORTS["276"].breakdownCols.find(({ key }) => key === "ill_1").outsideCriteria, true);
  assert.equal(RAPID_REPORTS["52"].tableName, "s_epi2");
  assert.equal(RAPID_REPORTS["52"].targetCols.length, 12);
  assert.equal(RAPID_REPORTS["52"].resultCols.length, 12);
  assert.ok(RAPID_REPORTS["52"].resultCols.every((col) => col.startsWith("mmr2_")));
});

test("currentThaiFiscalYear rolls over in October", () => {
  assert.equal(currentThaiFiscalYear(new Date("2026-07-12")), "2569");
  assert.equal(currentThaiFiscalYear(new Date("2026-10-01")), "2570");
});

test("each report has its own named route with a fixed-label bullet", () => {
  assert.deepEqual(RAPID_MENU.map(({ id }) => id).sort(), [...RAPID_REPORT_IDS].sort());
  assert.equal(RAPID_MENU.find(({ id }) => id === "143").href, "/rapid/dm-control");
  assert.equal(RAPID_MENU.find(({ id }) => id === "52").href, "/rapid/mmr2");
  assert.equal(RAPID_MENU.find(({ id }) => id === "276").href, "/rapid/screen-ht");
  assert.equal(RAPID_MENU.find(({ id }) => id === "275").href, "/rapid/screen-dm");
  // index bullet ใช้ href ของแต่ละ report ไม่ hardcode ในหน้า
  assert.match(indexSource, /RAPID_MENU/);
  assert.match(indexSource, /href=\{href\}/);
  for (const item of RAPID_MENU) assert.ok(item.title && item.title.length > 0);
});

test("dedicated pages each fetch their own report id via the shared hook", () => {
  assert.match(dmControlSource, /REPORT_ID = "143"/);
  assert.match(mmr2Source, /REPORT_ID = "52"/);
  assert.match(screenHtSource, /REPORT_ID = "276"/);
  assert.match(screenDmSource, /REPORT_ID = "275"/);
  for (const page of allPages) {
    assert.match(page, /useRapidReport\(REPORT_ID\)/);
    assert.match(page, /formatAffiliation/);
    assert.match(page, /rapidHospName/);
    assert.match(page, /RapidHdcReportMeta/);
    assert.match(page, /แหล่งข้อมูลจาก HDC กลาง/);
    // ทุกหน้ามี dropdown สังกัด + ปุ่ม export ที่ผูก report id ของตัวเอง
    assert.match(page, /ทุกสังกัด/);
    assert.match(page, /\/api\/rapid\/\$\{REPORT_ID\}\/export/);
    assert.match(page, /exportXlsxLink/);
    assert.match(page, /deficitDownload/);
  }
});

test("dm-control page shows the control-flow columns", () => {
  for (const label of ["หน่วยบริการ", "สังกัด", "% ตรวจ", "% คุมได้", "ยังไม่ได้ตรวจ"]) {
    assert.match(dmControlSource, new RegExp(label));
  }
  assert.match(dmControlSource, /row\.screenPercent/);
  assert.match(dmControlSource, /row\.controlPercent/);
  assert.match(dmControlSource, /row\.unexamined/);
});

test("mmr2 page shows the simple target/result columns", () => {
  for (const label of ["หน่วยบริการ", "สังกัด", "เป้าหมาย", "ร้อยละ", "ส่วนขาด"]) {
    assert.match(mmr2Source, new RegExp(label));
  }
  assert.match(mmr2Source, /row\.deficit/);
});

test("screening pages render the breakdown group with นอกเกณฑ์", () => {
  for (const page of screenPages) {
    assert.match(page, /ผลการคัดกรอง/);
    assert.match(page, /rapidGroupHeader/);
    assert.match(page, /%คัดกรอง/);
    assert.match(page, /ส่วนขาด \(คน\)/);
    // breakdown columns มาจาก data.breakdownCols (API) แล้ว render ต่อท้ายกลุ่ม
    assert.match(page, /data\?\.breakdownCols/);
    assert.match(page, /row\[column\.key\]/);
  }
});

test("shared hook loads data, filters สังกัด and sorts via query string", () => {
  assert.match(hookSource, /\/api\/rapid\/\$\{reportId\}/);
  assert.match(hookSource, /searchParams\.get\("aff"\)/);
  assert.match(hookSource, /setParam/);
  assert.match(hookSource, /searchParams\.get\("sort"\)/);
  assert.match(hookSource, /searchParams\.get\("dir"\)/);
  assert.match(hookSource, /router\.replace/);
  assert.match(hookSource, /params\.set\("sort"/);
  assert.match(hookSource, /params\.set\("dir"/);
  // ดาวน์โหลดรายคน → แจ้งเตือน PERSON ยังไม่ครบ
  assert.match(hookSource, /import Swal from "sweetalert2"/);
  assert.match(hookSource, /downloadIndividual/);
  assert.match(hookSource, /ข้อมูล PERSON ในระบบ SUB-HDC ของหน่วยบริการนี้ยังไม่ครบ/);
});

test("sort helper provides sortRows and a clickable SortHeader", () => {
  assert.match(sortSource, /export function sortRows/);
  assert.match(sortSource, /export function SortHeader/);
  for (const page of allPages) assert.match(page, /SortHeader/);
});

test("rapid data helper fetches live from HDC and derives every metric", () => {
  assert.match(dataSource, /report_data/);
  assert.match(dataSource, /getHospInfoMap/);
  assert.match(dataSource, /byHospcode/);
  assert.match(dataSource, /deficit/);
  assert.match(dataSource, /screenPercent/);
  assert.match(dataSource, /controlPercent/);
  assert.match(dataSource, /unexamined/);
  assert.match(dataSource, /breakdownCols/);
  assert.match(dataSource, /sourceCols/);
  // นอกเกณฑ์ = max(0, ผลงาน - breakdown อื่น)
  assert.match(dataSource, /outsideCriteria/);
  assert.match(dataSource, /Math\.max\(0/);
  // route + export ใช้ helper ตัวเดียวกัน
  assert.match(routeSource, /loadRapidReport/);
  assert.match(routeSource, /report_name/);
  assert.match(routeSource, /source_table/);
  assert.match(routeSource, /hdc_report_name/);
  assert.match(exportSource, /loadRapidReport/);
  assert.match(dataSource, /c_hostype/);
  assert.match(dataSource, /affiliation/);
});

test("dm-control displays live HDC report metadata above its datagrid", () => {
  assert.match(hdcReportMetaSource, /hdc_report_name :/);
  assert.match(hdcReportMetaSource, /hdc_table :/);
  assert.match(hdcReportMetaSource, /reportName/);
  assert.match(hdcReportMetaSource, /sourceTable/);
  assert.ok(
    dmControlSource.indexOf("<RapidHdcReportMeta")
      < dmControlSource.indexOf('className="tableWrap rapidTableWrap"')
  );
});

test("rapid export honours the affiliation filter and layout per report", () => {
  assert.match(exportSource, /XLSX/);
  assert.match(exportSource, /affiliation/);
  assert.match(exportSource, /spreadsheetml\.sheet/);
  assert.match(exportSource, /report\.controlLabel/);
  assert.match(exportSource, /% ตรวจ/);
  assert.match(exportSource, /% คุมได้/);
  assert.match(exportSource, /%คัดกรอง/);
  assert.match(exportSource, /report\.breakdownCols/);
  assert.match(exportSource, /showBreakdownPercent/);
});

test("rapid fixes amphoe from .env AMP_CODE inside the data helper", () => {
  assert.match(dataSource, /process\.env\.AMP_CODE/);
  assert.match(dataSource, /row\.ampCode === AMP_CODE/);
  for (const page of allPages) assert.match(page, /ampName/);
});

test("rapid owns its breadcrumb entry keyed by page slug", () => {
  assert.equal(RAPID_BREADCRUMB.prefix, "/rapid");
  assert.equal(RAPID_BREADCRUMB.href, "/rapid/index");
  for (const { href, title } of RAPID_MENU) {
    assert.equal(RAPID_BREADCRUMB.pages[href], title);
  }
  assert.match(headerSource, /RAPID_BREADCRUMB/);
  assert.doesNotMatch(headerSource, /งานเร่งรัดติดตาม/);
});

test("legacy numeric routes redirect to the named pages", () => {
  assert.match(nextConfigSource, /"\/rapid\/143".*"\/rapid\/dm-control"/s);
  assert.match(nextConfigSource, /"\/rapid\/52".*"\/rapid\/mmr2"/s);
  assert.match(nextConfigSource, /"\/rapid\/276".*"\/rapid\/screen-ht"/s);
  assert.match(nextConfigSource, /"\/rapid\/275".*"\/rapid\/screen-dm"/s);
});
