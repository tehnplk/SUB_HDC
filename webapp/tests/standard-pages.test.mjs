import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../app/standard/index/page.js", import.meta.url), "utf8");
const typeareaSource = readFileSync(new URL("../app/standard/person-typearea/page.js", import.meta.url), "utf8");
const pyramidPageSource = readFileSync(new URL("../app/standard/person-pyramid/page.js", import.meta.url), "utf8");
const pyramidApiSource = readFileSync(new URL("../app/api/person-pyramid/route.js", import.meta.url), "utf8");

test("standard index offers the requested population menus", () => {
  assert.match(indexSource, /ประชากรแยกตาม TYPEAREA/);
  assert.match(indexSource, /ประชากรแยกช่วงอายุ 5 ปี/);
  assert.match(indexSource, /href: "\/standard\/person-typearea"/);
  assert.match(indexSource, /href: "\/standard\/person-pyramid"/);
  assert.match(indexSource, /moduleTopicList/);
  assert.match(indexSource, /moduleTopicBullet/);
  assert.doesNotMatch(indexSource, /standardIntro|standardMenuCard/);
});

test("Typearea and pyramid pages are available under /standard", () => {
  assert.match(typeareaSource, /dashboard\/person-target\/page/);
  assert.match(pyramidPageSource, /fetch\("\/api\/person-pyramid"/);
  assert.match(pyramidPageSource, /85\+/);
});

test("population pyramid API reads the transform table and preserves both sexes", () => {
  assert.match(pyramidApiSource, /s_person_pyramid/);
  assert.match(pyramidApiSource, /SELECT hospcode, age_range, male, female/);
  assert.match(pyramidApiSource, /getHospNameMap/);
});
