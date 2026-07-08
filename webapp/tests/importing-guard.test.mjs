import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guardSource = readFileSync(new URL("../components/importing-guard.jsx", import.meta.url), "utf8");
const statusRoute = readFileSync(new URL("../app/api/import-status/route.js", import.meta.url), "utf8");
const reportPage = readFileSync(new URL("../app/dashboard/report/page.js", import.meta.url), "utf8");
const aiPage = readFileSync(new URL("../app/ai/chat/page.js", import.meta.url), "utf8");
const importStatusLib = readFileSync(new URL("../lib/import-status.mjs", import.meta.url), "utf8");

test("import-status helper checks pending/processing rows", () => {
  assert.match(importStatusLib, /status IN \('pending','processing'\)/);
  assert.match(importStatusLib, /export async function isImporting/);
});

test("import-status endpoint returns the importing flag from the shared helper", () => {
  assert.match(statusRoute, /import \{ isImporting \} from "@\/lib\/import-status\.mjs"/);
  assert.match(statusRoute, /importing: await isImporting\(conn\)/);
});

test("useImportingGuard polls import-status every 15s", () => {
  assert.match(guardSource, /fetch\("\/api\/import-status"/);
  assert.match(guardSource, /setInterval\(check, 15000\)/);
  assert.match(guardSource, /export function useImportingGuard/);
  assert.match(guardSource, /export function ImportingNotice/);
});

test("report page blocks the report list while importing", () => {
  assert.match(reportPage, /import \{ ImportingNotice, useImportingGuard \} from "@\/components\/importing-guard"/);
  assert.match(reportPage, /const importing = useImportingGuard\(\)/);
  assert.match(reportPage, /\{importing \? <ImportingNotice \/> : null\}/);
  assert.match(reportPage, /className="tableWrap" hidden=\{importing\}/);
});

test("ai chat page hides the composer while importing", () => {
  assert.match(aiPage, /import \{ ImportingNotice, useImportingGuard \} from "@\/components\/importing-guard"/);
  assert.match(aiPage, /const importing = useImportingGuard\(\)/);
  assert.match(aiPage, /\{importing \? \(\s*<ImportingNotice \/>/);
});
