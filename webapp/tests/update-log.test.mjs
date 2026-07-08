import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { compareVersions, getMaxUpdateVersion, getMaxVersionFromApi } from "../lib/update-log.mjs";

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

test("dashboard version badge reads from update_log instead of package json", () => {
  assert.match(titleSource, /import updateLog from "\.\.\/version\/update_log\.json"/);
  assert.match(titleSource, /const currentVersion = getMaxUpdateVersion\(updateLog\)/);
  assert.match(titleSource, /`Version \$\{currentVersion\}`/);
  assert.doesNotMatch(titleSource, /package\.json/);
});

test("dashboard version badge links to update log page", () => {
  assert.match(titleSource, /import Link from "next\/link"/);
  assert.match(titleSource, /href="\/update-log"/);
  assert.match(titleSource, /className=\{`versionLabel\$\{newerVersion \? " versionLabelUpdate" : ""\}`\}/);
});

test("dashboard version badge checks the center sub-version api with a timeout guard", () => {
  assert.match(titleSource, /https:\/\/subhdc\.plkhealth\.go\.th\/api\/sub-version/);
  assert.match(titleSource, /getMaxVersionFromApi\(payload\)/);
  assert.match(titleSource, /compareVersions\(latest, currentVersion\) > 0/);
  // network guard: abort controller + timeout, all errors swallowed
  assert.match(titleSource, /const VERSION_CHECK_TIMEOUT_MS = \d+/);
  assert.match(titleSource, /new AbortController\(\)/);
  assert.match(titleSource, /controller\.abort\(\)/);
  assert.match(titleSource, /signal: controller\.signal/);
});

test("dashboard version badge fades the whole label between version and new-version notice every 2s", () => {
  assert.match(titleSource, /const BLINK_INTERVAL_MS = 2000/);
  assert.match(titleSource, /const FADE_MS = \d+/);
  // fade out -> swap content -> fade in
  assert.match(titleSource, /setVersionVisible\(false\)/);
  assert.match(titleSource, /setShowNewer\(\(prev\) => !prev\)/);
  assert.match(titleSource, /setVersionVisible\(true\)/);
  // blinks between the current version and the "ตรวจพบเวอร์ชั่นใหม่กว่า …" notice
  assert.match(titleSource, /newerVersion && showNewer \? `ตรวจพบเวอร์ชั่นใหม่กว่า \$\{newerVersion\}` : `Version \$\{currentVersion\}`/);
  // opacity fade applies to the whole label (inline style on the Link)
  assert.match(titleSource, /opacity: versionVisible \? 1 : 0/);
  assert.match(stylesSource, /\.versionLabel\.versionLabelUpdate\s*\{[\s\S]*transition:\s*opacity/);
});

test("getMaxVersionFromApi extracts the highest version from the api payload", () => {
  assert.equal(
    getMaxVersionFromApi({
      success: true,
      data: [
        { id: 3, version: "1.1.4" },
        { id: 1, version: "1.1.10" },
        { id: 2, version: "1.1.9" },
      ],
    }),
    "1.1.10"
  );
  assert.equal(getMaxVersionFromApi({ success: true }), "");
  assert.equal(getMaxVersionFromApi(null), "");
});

test("compareVersions orders semantic versions numerically", () => {
  assert.ok(compareVersions("1.1.10", "1.1.9") > 0);
  assert.ok(compareVersions("1.1.4", "1.1.4") === 0);
  assert.ok(compareVersions("1.0.9", "1.1.1") < 0);
});

test("update log page renders version date and issue fields from update_log", () => {
  assert.equal(existsSync(updateLogPageUrl), true);

  const pageSource = readFileSync(updateLogPageUrl, "utf8");
  assert.match(pageSource, /import updateLog from "@\/version\/update_log\.json"/);
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
