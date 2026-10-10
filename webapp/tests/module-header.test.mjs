import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const headerImageSource = readFileSync(new URL("../components/dashboard-header-image.jsx", import.meta.url), "utf8");
const pageTitleSource = readFileSync(new URL("../components/dashboard-page-title.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
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

test("update-log uses the shared header", () => {
  assert.match(updateLogSource, /ModuleHeader/);
});

test("breadcrumbs only list modules that still have pages", () => {
  const prefixes = [...headerSource.matchAll(/prefix: "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(prefixes, ["/import-check", "/quality", "/upload", "/update-log", "/admin/addon", "/admin"]);
});

test("main tab shows only ปริมาณข้อมูล, คุณภาพ and GIS", () => {
  const labels = [...mainTabSource.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(labels, ["ปริมาณข้อมูล", "คุณภาพ", "GIS"]);
  assert.match(mainTabSource, /pathname\.startsWith\("\/import-check\/"\)/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/quality\/"\)/);
});

test("gis is a left-group main tab and Add-On is the right-aligned last item", () => {
  const gisSource = readFileSync(new URL("../app/gis/page.js", import.meta.url), "utf8");

  assert.match(mainTabSource, /href: "\/gis", label: "GIS"/);
  assert.match(mainTabSource, /pathname\.startsWith\("\/gis\/"\)/);
  assert.doesNotMatch(mainTabSource, /TABS_END|tabButtonEnd/);
  assert.match(mainTabSource, /import AddonTab from "@\/components\/addon-tab"/);
  assert.match(mainTabSource, /renderTab\(tab, pathname\)\)\}\s*<AddonTab \/>\s*<\/nav>/);
  assert.match(globalCss, /\.addonTabWrap \{[^}]*margin-left: auto/);
  assert.match(globalCss, /\.addonTabButton\.tabButtonActive[^{]*\{[^}]*background: var\(--panel\)/);
  // /gis ไม่มี breadcrumb — หน้าเป็นแผนที่เต็มพื้นที่ ไม่ต้องมีป้าย "GIS" ซ้ำกับ tab
  assert.doesNotMatch(headerSource, /prefix: "\/gis"/);
  assert.match(gisSource, /ModuleHeader/);
});

test("all portal topic menus use one topic-only line", () => {
  const portalSources = [
    "../app/dashboard/quality/page.js",
    "../app/import-check/index/page.js",
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
  assert.match(globalCss, /\.moduleTopicText\s*\{[\s\S]*?font-weight:\s*400;/);
  assert.doesNotMatch(globalCss, /moduleTopicList(?:Compact|Small) \.moduleTopicText/);
});
