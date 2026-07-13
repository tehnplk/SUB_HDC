import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Excel exports deny Guest and unauthenticated users at every file endpoint", () => {
  const guardSource = read("../lib/auth-guard.mjs");
  const dmHtExport = read("../app/api/dm-ht-count/export/route.js");
  const personDupExport = read("../app/api/quality/person-dup/export/route.js");
  const rapidExport = read("../app/api/rapid/[id]/export/route.js");
  const aiExport = read("../app/api/ai/export/[filename]/route.js");
  const aiChat = read("../app/api/ai/chat/route.js");

  assert.match(guardSource, /export async function requireExcelExportAccess/);
  assert.match(guardSource, /!session\?\.user/);
  assert.match(guardSource, /Number\(session\.user\.roleId\) === 4/);
  for (const source of [dmHtExport, personDupExport, rapidExport, aiExport]) {
    assert.match(source, /requireExcelExportAccess/);
    assert.match(source, /exportDenied/);
  }
  assert.match(aiChat, /userRequestedExcelExport\(messages\)/);
  assert.match(aiChat, /requireExcelExportAccess/);
});
