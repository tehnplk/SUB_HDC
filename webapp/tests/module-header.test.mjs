import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const typeareaSource = readFileSync(new URL("../app/dashboard/person-target/page.js", import.meta.url), "utf8");
const pyramidSource = readFileSync(new URL("../app/standard/person-pyramid/page.js", import.meta.url), "utf8");
const standardIndexSource = readFileSync(new URL("../app/standard/index/page.js", import.meta.url), "utf8");
const targetGroupIndexSource = readFileSync(new URL("../app/target-group/index/page.js", import.meta.url), "utf8");
const updateLogSource = readFileSync(new URL("../app/update-log/page.js", import.meta.url), "utf8");
const globalCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("ModuleHeader owns the shared title and main navigation without a redundant topic row", () => {
  assert.match(headerSource, /DashboardHeaderImage/);
  assert.match(headerSource, /DashboardPageTitle/);
  assert.match(headerSource, /MainTab/);
  assert.doesNotMatch(headerSource, /moduleTopic|topic/);
  assert.match(headerSource, /href="\/upload"/);
  assert.match(headerSource, /UploadCloud/);
  assert.doesNotMatch(headerSource, /ACTIONS|selectedAction|action =/);
  assert.match(headerSource, /moduleBreadcrumb/);
  assert.match(headerSource, /aria-label="Breadcrumb"/);
});

test("shared module header separates main navigation from breadcrumbs with a dashed rule", () => {
  assert.match(globalCss, /\.moduleHeaderCore\s*\{[\s\S]*?border-bottom:\s*1px dashed var\(--border\)/);
  assert.match(globalCss, /\.moduleBreadcrumb/);
});

test("standard submodules use the shared header rather than a second tab bar", () => {
  assert.match(typeareaSource, /ModuleHeader/);
  assert.match(pyramidSource, /ModuleHeader/);
  assert.match(standardIndexSource, /ModuleHeader/);
  assert.match(updateLogSource, /ModuleHeader/);
  assert.doesNotMatch(typeareaSource, /StandardTabs/);
  assert.doesNotMatch(pyramidSource, /StandardTabs/);
  assert.doesNotMatch(standardIndexSource, /StandardTabs/);
});

test("standard navigation stays active across its child routes", () => {
  assert.match(mainTabSource, /pathname\.startsWith\("\/standard\/"\)/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/import-check\/"\)/);
});

test("target-group is a main-tab module with an index menu of its child topics", () => {
  assert.match(mainTabSource, /\/target-group\/index/);
  assert.match(mainTabSource, /ทะเบียนกลุ่มเป้าหมาย/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/target-group\/"\)/);
  assert.match(headerSource, /prefix: "\/target-group"/);
  assert.match(targetGroupIndexSource, /ModuleHeader/);
  assert.match(targetGroupIndexSource, /moduleTopicList/);
  assert.match(targetGroupIndexSource, /กลุ่มเป้าหมายตามตัวชี้วัด/);
  assert.match(targetGroupIndexSource, /href: "\/target-group\/kpi"/);
  assert.match(targetGroupIndexSource, /ทะเบียนรายคนของกลุ่มเป้าหมายที่ใช้นับตัวชี้วัด/);
  assert.doesNotMatch(targetGroupIndexSource, /จำนวนผู้ป่วย DM\/HT ในเขต/);
  const targetGroupKpiSource = readFileSync(
    new URL("../app/target-group/kpi/page.js", import.meta.url),
    "utf8"
  );
  assert.match(targetGroupKpiSource, /href="\/target-group\/kpi\/dm-ht-count"/);
  assert.match(targetGroupKpiSource, /จำนวนผู้ป่วย DM\/HT/);
  assert.doesNotMatch(targetGroupKpiSource, /<small>/);
  assert.match(targetGroupKpiSource, /moduleTopicListSmall/);
  assert.match(globalCss, /\.moduleTopicListSmall \.standardMenuText strong\s*\{\s*font-size:\s*14px;/);
  assert.match(targetGroupIndexSource, /กลุ่มเป้าหมายการจัดเก็บรายได้/);
  assert.match(headerSource, /"\/target-group\/kpi\/dm-ht-count": "จำนวนผู้ป่วย DM\/HT"/);
});

test("rapid is a right-aligned main-tab module with a title-only topic list", () => {
  const rapidIndexSource = readFileSync(
    new URL("../app/rapid/index/page.js", import.meta.url),
    "utf8"
  );

  assert.match(mainTabSource, /TABS_END/);
  assert.match(mainTabSource, /tabButtonEnd/);
  assert.match(mainTabSource, /\/rapid\/index/);
  assert.match(mainTabSource, /งานเร่งรัดติดตาม/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/rapid\/"\)/);
  assert.match(headerSource, /prefix: "\/rapid"/);
  assert.match(rapidIndexSource, /ModuleHeader/);
  assert.match(rapidIndexSource, /moduleTopicList/);
  assert.match(rapidIndexSource, /DM Control/);
  assert.match(rapidIndexSource, /MMR2/);
  assert.match(rapidIndexSource, /โรคความดันโลหิตสูง/);
  assert.match(rapidIndexSource, /โรคเบาหวาน/);
  // bullet เป็นข้อความบรรทัดเดียว — ไม่มี description ใต้หัวข้อ
  assert.doesNotMatch(rapidIndexSource, /<small>/);
});

test("report is a top-level module rather than a Dashboard main-tab item", () => {
  assert.match(mainTabSource, /\/report\/index/);
  assert.match(mainTabSource, /รายงาน/);
  assert.doesNotMatch(mainTabSource, /dashboard\/report/);
});
