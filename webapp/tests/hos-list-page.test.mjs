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
