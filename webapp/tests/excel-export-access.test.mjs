import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Excel exports deny Guest and unauthenticated users at every file endpoint", () => {
  const guardSource = read("../lib/auth-guard.mjs");

  assert.match(guardSource, /export async function requireExcelExportAccess/);
  assert.match(guardSource, /!session\?\.user/);
  assert.match(guardSource, /Number\(session\.user\.roleId\) === 4/);
  for (const path of [
    "../app/api/quality/person-dup/export/route.js",
  ]) {
    const source = read(path);
    assert.match(source, /requireExcelExportAccess/, path);
  }
});
