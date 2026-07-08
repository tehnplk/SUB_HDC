import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/dashboard/hos-list/page.js", import.meta.url), "utf8");

test("hos-list defaults the file filter to SERVICE", () => {
  assert.match(pageSource, /const selectedFileQuery = searchParams\.get\("file"\) \|\| "service";/);
  assert.match(pageSource, /const \[selectedFile,\s*setSelectedFile\] = useState\(selectedFileQuery\);/);
  assert.match(pageSource, /if \(selectedFile\) params\.set\("file", selectedFile\);/);
});

test("hos-list filter is driven by URL query string", () => {
  assert.match(pageSource, /import \{ usePathname, useRouter, useSearchParams \} from "next\/navigation";/);
  assert.match(pageSource, /const router = useRouter\(\);/);
  assert.match(pageSource, /const pathname = usePathname\(\);/);
  assert.match(pageSource, /const searchParams = useSearchParams\(\);/);
  assert.match(pageSource, /searchParams\.get\("file"\) \|\| "service"/);
  assert.match(pageSource, /function updateFilterQuery\(\{ file, fiscalYear \}\)/);
  assert.match(pageSource, /router\.replace\(`\$\{pathname\}\$\{nextQuery \? `\?\$\{nextQuery\}` : ""\}`,\s*\{ scroll: false \}\);/);
});

import { readFileSync as readFileSync2 } from "node:fs";
const routeSource = readFileSync2(new URL("../app/api/dashboard/route.js", import.meta.url), "utf8");

test("dashboard API short-circuits with importing flag when an import is running", () => {
  // uses the shared isImporting helper before touching the big tables
  assert.match(routeSource, /import \{ isImporting \} from "@\/lib\/import-status\.mjs"/);
  assert.match(routeSource, /if \(await isImporting\(conn\)\)/);
  assert.match(routeSource, /importing: true/);
  // the guard runs before the heavy per-file query path (the c_file lookup that
  // precedes reading the big tables — the last occurrence, not the summary block)
  const guardIdx = routeSource.indexOf("importing: true");
  const heavyIdx = routeSource.lastIndexOf("SELECT file_name FROM c_file");
  assert.ok(guardIdx !== -1 && heavyIdx !== -1 && guardIdx < heavyIdx);
});

test("hos-list shows an importing notice instead of the table while importing", () => {
  assert.match(pageSource, /const importing = Boolean\(data\?\.importing\)/);
  assert.match(pageSource, /กำลังมีการนำเข้าข้อมูล/);
  assert.match(pageSource, /กรุณากลับมาอีกครั้งเมื่อการนำเข้าสิ้นสุด/);
  // table and filters are hidden while importing
  assert.match(pageSource, /className="filterGrid" hidden=\{importing\}/);
  assert.match(pageSource, /className="tableWrap monthlyTableWrap" hidden=\{importing\}/);
});

test("hos-list auto-polls while importing so the notice clears on its own", () => {
  // a refreshTick state drives re-fetch; an interval bumps it only while importing
  assert.match(pageSource, /const \[refreshTick,\s*setRefreshTick\] = useState\(0\)/);
  assert.match(pageSource, /if \(!data\?\.importing\) return;/);
  assert.match(pageSource, /setInterval\(\(\) => setRefreshTick\(\(tick\) => tick \+ 1\), 15000\)/);
  assert.match(pageSource, /\}, \[data\?\.importing\]\)/);
  // refreshTick is part of the fetch effect deps, and polling stays silent (no loading flicker)
  assert.match(pageSource, /\[query, selectedFile, selectedFiscalYear, refreshTick\]/);
  assert.match(pageSource, /const isPoll = refreshTick > 0/);
});
