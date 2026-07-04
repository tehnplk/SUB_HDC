import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { getMaxUpdateVersion } from "../lib/update-log.mjs";

const titleSource = readFileSync(new URL("../components/dashboard-page-title.jsx", import.meta.url), "utf8");
const updateLogPageUrl = new URL("../app/update-log/page.js", import.meta.url);
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("getMaxUpdateVersion returns the highest semantic version from update log rows", () => {
  assert.equal(
    getMaxUpdateVersion([
      { version: "1.0.6", update_date: "2026-07-04", issue: "older" },
      { version: "1.2.0", update_date: "2026-07-04", issue: "newer" },
      { version: "1.10.0", update_date: "2026-07-04", issue: "newest" },
    ]),
    "1.10.0"
  );
});

test("dashboard version badge reads from upldate_log instead of package json", () => {
  assert.match(titleSource, /import updateLog from "\.\.\/upldate_log\.json"/);
  assert.match(titleSource, /Version \{getMaxUpdateVersion\(updateLog\)\}/);
  assert.doesNotMatch(titleSource, /package\.json/);
});

test("dashboard version badge links to update log page", () => {
  assert.match(titleSource, /import Link from "next\/link"/);
  assert.match(titleSource, /<Link\s+href="\/update-log"\s+className="versionLabel"/);
});

test("update log page renders version date and issue fields from upldate_log", () => {
  assert.equal(existsSync(updateLogPageUrl), true);

  const pageSource = readFileSync(updateLogPageUrl, "utf8");
  assert.match(pageSource, /import updateLog from "@\/upldate_log\.json"/);
  assert.match(pageSource, /title:\s*"Version Update Log"/);
  assert.match(pageSource, /<h4 className="pageHeaderTitle">Version Update Log<\/h4>/);
  assert.doesNotMatch(pageSource, />Update Log<\/h4>/);
  assert.doesNotMatch(pageSource, /Application version history/);
  assert.match(pageSource, /entry\.version/);
  assert.match(pageSource, /entry\.update_date/);
  assert.match(pageSource, /entry\.issue/);
});

test("update log issue text preserves escaped newline characters", () => {
  const pageSource = readFileSync(updateLogPageUrl, "utf8");

  assert.match(pageSource, /className="updateLogIssue"/);
  assert.match(stylesSource, /\.updateLogIssue\s*\{\s*white-space:\s*pre-line;/);
});
