import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const headerImageSource = readFileSync(new URL("../components/dashboard-header-image.jsx", import.meta.url), "utf8");
const pageTitleSource = readFileSync(new URL("../components/dashboard-page-title.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const typeareaSource = readFileSync(new URL("../app/dashboard/person-target/page.js", import.meta.url), "utf8");
const pyramidSource = readFileSync(new URL("../app/standard/person-pyramid/page.js", import.meta.url), "utf8");
const standardIndexSource = readFileSync(new URL("../app/standard/index/page.js", import.meta.url), "utf8");
const targetGroupIndexSource = readFileSync(new URL("../app/target-group/index/page.js", import.meta.url), "utf8");
const topicBulletSource = readFileSync(new URL("../components/topic-bullet.jsx", import.meta.url), "utf8");
const breadcrumbSource = readFileSync(new URL("../components/breadcrumb.jsx", import.meta.url), "utf8");
const updateLogSource = readFileSync(new URL("../app/update-log/page.js", import.meta.url), "utf8");
const globalCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("ModuleHeader owns the shared title and main navigation without a redundant topic row", () => {
  assert.match(headerSource, /DashboardHeaderImage/);
  assert.match(headerImageSource, /<Link href="\/"/);
  assert.match(headerImageSource, /aria-label="ไปหน้า Landing"/);
  assert.match(headerSource, /DashboardPageTitle/);
  assert.match(headerSource, /MainTab/);
  assert.doesNotMatch(headerSource, /subtitle \? <p className="lead">/);
  assert.doesNotMatch(headerSource, /moduleTopic|topic/);
  assert.match(headerSource, /href="\/upload"/);
  assert.match(headerSource, /UploadCloud/);
  assert.doesNotMatch(headerSource, /ACTIONS|selectedAction|action =/);
  assert.match(headerSource, /import Breadcrumb from "@\/components\/breadcrumb"/);
  assert.match(headerSource, /<Breadcrumb items=\{breadcrumbItems\} \/>/);
  assert.match(breadcrumbSource, /className="moduleBreadcrumb"/);
  assert.match(breadcrumbSource, /aria-label="Breadcrumb"/);
  assert.match(pageTitleSource, /className="headerSubline"/);
  assert.match(globalCss, /\.pageHeaderTitle \{[\s\S]*?flex-wrap: wrap/);
  assert.match(globalCss, /\.pageHeaderTitle \.headerSubline \{[\s\S]*?order: 2/);
  assert.match(globalCss, /\.pageHeaderTitle \.headerSubline \{[\s\S]*?margin-top: 2px/);
});

test("shared module header separates main navigation from breadcrumbs with a dashed rule", () => {
  assert.match(globalCss, /\.moduleHeaderCore\s*\{[\s\S]*?border-bottom:\s*1px dashed var\(--border\)/);
  assert.match(globalCss, /\.tabsContainer \{[\s\S]*?margin: 0 0 12px/);
  assert.match(globalCss, /\.moduleBreadcrumb/);
  assert.match(globalCss, /\.moduleBreadcrumb li\s*\{[\s\S]*?font-size:\s*15px;/);
  assert.match(breadcrumbSource, /function Breadcrumb\(\{ items \}\)/);
  assert.match(breadcrumbSource, /items\.map/);
  assert.match(breadcrumbSource, /ChevronRight/);
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
  assert.match(mainTabSource, /href: "\/standard\/index", label: "ข้อมูลพื้นฐาน"/);
});

test("target-group is a main-tab module with an index menu of its child topics", () => {
  assert.match(mainTabSource, /\/target-group\/index/);
  assert.match(mainTabSource, /href: "\/target-group\/index", label: "กลุ่มเป้าหมาย"/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/target-group\/"\)/);
  assert.match(headerSource, /prefix: "\/target-group"/);
  assert.match(targetGroupIndexSource, /ModuleHeader/);
  assert.match(targetGroupIndexSource, /moduleTopicList/);
  assert.match(targetGroupIndexSource, /TopicBullet/);
  assert.match(targetGroupIndexSource, /กลุ่มเป้าหมายตามตัวชี้วัด/);
  assert.match(targetGroupIndexSource, /href: "\/target-group\/kpi"/);
  assert.doesNotMatch(targetGroupIndexSource, /description:|<small>|standardMenuText/);
  assert.doesNotMatch(targetGroupIndexSource, /จำนวนผู้ป่วย DM\/HT ในเขต/);
  const targetGroupKpiSource = readFileSync(
    new URL("../app/target-group/kpi/page.js", import.meta.url),
    "utf8"
  );
  assert.match(targetGroupKpiSource, /href="\/target-group\/kpi\/dm-ht"/);
  assert.match(targetGroupKpiSource, /จำนวนผู้ป่วย DM\/HT/);
  assert.doesNotMatch(targetGroupKpiSource, /<small>/);
  assert.doesNotMatch(targetGroupKpiSource, /moduleTopicListSmall/);
  assert.match(targetGroupIndexSource, /กลุ่มเป้าหมายการจัดเก็บรายได้/);
  assert.match(headerSource, /"\/target-group\/kpi\/dm-ht": \[/);
  assert.match(headerSource, /href: "\/target-group\/kpi", label: "กลุ่มเป้าหมายตามตัวชี้วัด"/);
  assert.match(headerSource, /label: "จำนวนผู้ป่วย DM\/HT"/);
  assert.match(headerSource, /const currentPages = Array\.isArray\(currentPage\)/);
});

test("gis is the right-aligned main-tab module", () => {
  const gisSource = readFileSync(new URL("../app/gis/page.js", import.meta.url), "utf8");

  assert.match(mainTabSource, /TABS_END/);
  assert.match(mainTabSource, /tabButtonEnd/);
  assert.match(mainTabSource, /href: "\/gis", label: "GIS"/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/gis\/"\)/);
  // /gis ไม่มี breadcrumb — หน้าเป็นแผนที่เต็มพื้นที่ ไม่ต้องมีป้าย "GIS" ซ้ำกับ tab
  assert.doesNotMatch(headerSource, /prefix: "\/gis"/);
  assert.match(gisSource, /ModuleHeader/);
  // กลุ่มขวา (GIS + Add-On) ชิดขอบขวาผ่าน tabButtonEnd — ต้องเป็น rule ระดับบนสุด
  // ต่อจาก .tabsContainer ไม่ใช่อยู่ใน @media ไม่งั้นชิดขวาเฉพาะจอเล็ก
  assert.match(
    globalCss,
    /\.tabsContainer \{\s*display: flex;[^}]*\}\s*(?:\/\*[^*]*\*\/\s*)?\.tabButton\.tabButtonEnd \{\s*margin-left: auto;/,
  );
  assert.doesNotMatch(globalCss, /\.addonTabWrap \{[^}]*margin-left: auto;/);
});

test("all portal topic menus use one topic-only line", () => {
  const portalSources = [
    "../app/dashboard/quality/page.js",
    "../app/import-check/index/page.js",
    "../app/standard/index/page.js",
    "../app/target-group/index/page.js",
    "../app/target-group/kpi/page.js",
    "../app/workload/page.js",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  for (const portalSource of portalSources) {
    assert.match(portalSource, /moduleTopicList/);
    assert.match(portalSource, /TopicBullet/);
    assert.doesNotMatch(portalSource, /description:|<small>|standardMenuText/);
  }

  assert.match(topicBulletSource, /function TopicBullet\(\{ href, topic \}\)/);
  assert.match(topicBulletSource, /moduleTopicBullet/);
  assert.match(topicBulletSource, /moduleTopicText/);
  assert.match(topicBulletSource, /ChevronRight/);
  assert.match(globalCss, /\.moduleTopicText\s*\{[\s\S]*?white-space:\s*nowrap;/);
  assert.match(globalCss, /\.moduleTopicText\s*\{[\s\S]*?font-size:\s*14px;/);
  assert.match(globalCss, /\.moduleTopicText\s*\{[\s\S]*?font-weight:\s*700;/);
  assert.doesNotMatch(globalCss, /moduleTopicList(?:Compact|Small) \.moduleTopicText/);
});

test("report is a top-level module rather than a Dashboard main-tab item", () => {
  assert.match(mainTabSource, /\/report\/index/);
  assert.match(mainTabSource, /รายงาน/);
  assert.doesNotMatch(mainTabSource, /dashboard\/report/);
});
