import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("shared fiscal-year and affiliation controls preserve standard labels", async () => {
  const [fiscalYear, affiliation] = await Promise.all([
    readFile(path.join(root, "components", "fiscal-year-filter.jsx"), "utf8"),
    readFile(path.join(root, "components", "affiliation-filter.jsx"), "utf8"),
  ]);

  assert.match(fiscalYear, /ปีงบประมาณ \{year\}/);
  assert.match(affiliation, /allLabel = "ทุกสังกัด"/);
});

test("fiscal-year and affiliation filters use shared components", async () => {
  const pages = [
    "app/quality/service-instype-err/page.js",
    "app/workload/visit-monthly/page.js",
    "app/workload/ncdscreen-workload/page.js",
  ];
  const rapidPages = ["mmr2", "dm-control", "screen-dm", "screen-ht"];

  for (const relativePath of pages) {
    const source = await readFile(path.join(root, relativePath), "utf8");
    assert.match(source, /import FiscalYearFilter from "@\/components\/fiscal-year-filter"/);
    assert.match(source, /import AffiliationFilter from "@\/components\/affiliation-filter"/);
    assert.match(source, /<FiscalYearFilter/);
    assert.match(source, /<AffiliationFilter/);
  }
  for (const page of rapidPages) {
    const source = await readFile(path.join(root, "app", "rapid", page, "page.js"), "utf8");
    assert.match(source, /import AffiliationFilter from "@\/components\/affiliation-filter"/);
    assert.match(source, /<AffiliationFilter/);
  }
});
