import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  clearImportProgress,
  getImportProgressPercent,
  updateImportProgressFromEvent,
} from "../lib/import-progress.mjs";

const dashboardRoutePath = path.resolve(process.cwd(), "app", "api", "dashboard", "route.js");

test("import progress stores progress percent by log import id", () => {
  clearImportProgress(42);

  updateImportProgressFromEvent(42, { type: "progress", percent: 67 });

  assert.equal(getImportProgressPercent(42), 67);
});

test("import progress ignores invalid percent values and clears on terminal events", () => {
  clearImportProgress(42);

  updateImportProgressFromEvent(42, { type: "progress", percent: 60 });
  updateImportProgressFromEvent(42, { type: "progress", percent: 999 });
  assert.equal(getImportProgressPercent(42), 60);

  updateImportProgressFromEvent(42, { type: "done", percent: 100 });
  assert.equal(getImportProgressPercent(42), null);
});

test("dashboard log import API returns progress percent for processing rows", async () => {
  const source = await readFile(dashboardRoutePath, "utf8");

  assert.match(source, /getImportProgressPercent/);
  assert.match(source, /progress_percent:/);
  assert.match(source, /r\.status === "processing" \? getImportProgressPercent\(r\.id\) : null/);
});
