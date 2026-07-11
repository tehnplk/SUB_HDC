import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const typeareaSource = readFileSync(new URL("../app/dashboard/person-target/page.js", import.meta.url), "utf8");
const pyramidSource = readFileSync(new URL("../app/standard/person-pyramid/page.js", import.meta.url), "utf8");
const standardIndexSource = readFileSync(new URL("../app/standard/index/page.js", import.meta.url), "utf8");
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

test("report is a top-level module rather than a Dashboard main-tab item", () => {
  assert.match(mainTabSource, /\/report\/index/);
  assert.match(mainTabSource, /รายงาน/);
  assert.doesNotMatch(mainTabSource, /dashboard\/report/);
});
