import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../app/standard/index/page.js", import.meta.url), "utf8");
const typeareaSource = readFileSync(new URL("../app/standard/person-typearea/page.js", import.meta.url), "utf8");
const pyramidPageSource = readFileSync(new URL("../app/standard/person-pyramid/page.js", import.meta.url), "utf8");
const pyramidApiSource = readFileSync(new URL("../app/api/person-pyramid/route.js", import.meta.url), "utf8");
const dmHtPageSource = readFileSync(new URL("../app/target-group/kpi/page.js", import.meta.url), "utf8");
const dmHtChildPageSource = readFileSync(new URL("../app/target-group/kpi/dm-ht/page.js", import.meta.url), "utf8");
const dmHtApiSource = readFileSync(new URL("../app/api/dm-ht-count/route.js", import.meta.url), "utf8");
const nextConfigSource = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");

test("standard index offers the requested population menus", () => {
  assert.match(indexSource, /ประชากรแยกตาม TYPEAREA/);
  assert.match(indexSource, /ประชากรแยกช่วงอายุ 5 ปี/);
  assert.match(indexSource, /href: "\/standard\/person-typearea"/);
  assert.match(indexSource, /href: "\/standard\/person-pyramid"/);
  assert.doesNotMatch(indexSource, /dm-ht-count/);
  assert.match(nextConfigSource, /source: "\/standard\/dm-ht-count"[\s\S]*?destination: "\/target-group\/kpi\/dm-ht"/);
  assert.match(nextConfigSource, /source: "\/target-group\/kpi\/dm-ht-count"[\s\S]*?destination: "\/target-group\/kpi\/dm-ht"/);
  assert.match(indexSource, /moduleTopicList/);
  assert.match(indexSource, /moduleTopicBullet/);
  assert.doesNotMatch(indexSource, /standardIntro|standardMenuCard/);
});

test("Typearea and pyramid pages are available under /standard", () => {
  assert.match(typeareaSource, /dashboard\/person-target\/page/);
  assert.match(pyramidPageSource, /fetch\("\/api\/person-pyramid"/);
  assert.match(pyramidPageSource, /85\+/);
});

test("dm-ht-count page and API count the DM/HT register per registered unit", () => {
  assert.match(dmHtChildPageSource, /DmHtCountDashboard/);
  assert.match(dmHtPageSource, /ModuleHeader/);
  assert.match(dmHtPageSource, /fetch\("\/api\/dm-ht-count"/);
  assert.match(dmHtPageSource, /hospNameShort/);
  assert.match(dmHtApiSource, /t_person_dm_ht/);
  assert.match(dmHtApiSource, /FIND_IN_SET\(u\.hospcode, t\.hos_person_type_1_3\)/);
  assert.match(dmHtApiSource, /getHospNameMap/);
});

test("dm-ht-count exports the unit register as xlsx without cid", () => {
  const exportSource = readFileSync(new URL("../app/api/dm-ht-count/export/route.js", import.meta.url), "utf8");
  assert.match(exportSource, /requireApiJwt/);
  assert.match(exportSource, /status: 302/);
  assert.match(exportSource, /Location: `\/error\/msg\?msg=/);
  assert.match(exportSource, /FIND_IN_SET\(\?, \\`hos_person_type_1_3\\`\)/);
  assert.doesNotMatch(exportSource, /"cid"/);
  assert.match(exportSource, /Content-Disposition/);
  assert.match(dmHtPageSource, /\/api\/dm-ht-count\/export\?hospcode=/);
  assert.match(dmHtPageSource, /FileSpreadsheet/);
});

test("population pyramid API reads the transform table and preserves both sexes", () => {
  assert.match(pyramidApiSource, /s_person_pyramid/);
  assert.match(pyramidApiSource, /SELECT hospcode, age_range, male, female/);
  assert.match(pyramidApiSource, /getHospNameMap/);
});
