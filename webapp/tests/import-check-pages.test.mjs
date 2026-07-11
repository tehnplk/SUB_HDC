import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../app/import-check/index/page.js", import.meta.url), "utf8");
const logImportSource = readFileSync(new URL("../app/import-check/log-import/page.js", import.meta.url), "utf8");
const hosListSource = readFileSync(new URL("../app/import-check/hos-list/page.js", import.meta.url), "utf8");
const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");

test("Import Check index offers the two requested child modules", () => {
  assert.match(indexSource, /ประวัติการนำเข้า/);
  assert.match(indexSource, /รายหน่วยงาน/);
  assert.match(indexSource, /\/import-check\/log-import/);
  assert.match(indexSource, /\/import-check\/hos-list/);
  assert.match(indexSource, /moduleTopicList/);
  assert.match(indexSource, /moduleTopicBullet/);
  assert.doesNotMatch(indexSource, /standardIntro|standardEyebrow|standardMenuCard|IMPORT CHECK/);
});

test("Import Check owns the canonical child routes", () => {
  assert.match(logImportSource, /dashboard\/log-import\/page/);
  assert.match(hosListSource, /dashboard\/hos-list\/page/);
  assert.match(mainTabSource, /\/import-check\/index/);
  assert.doesNotMatch(mainTabSource, /dashboard\/log-import/);
  assert.doesNotMatch(mainTabSource, /dashboard\/hos-list/);
});

test("legacy dashboard routes permanently redirect to Import Check", () => {
  assert.match(nextConfig, /source: "\/dashboard\/log-import"[\s\S]*?destination: "\/import-check\/log-import"/);
  assert.match(nextConfig, /source: "\/dashboard\/hos-list"[\s\S]*?destination: "\/import-check\/hos-list"/);
});
