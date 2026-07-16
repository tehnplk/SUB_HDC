import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("HospitalFilter filters code or name immediately and keeps the list closed when cleared", async () => {
  const source = await readFile(path.join(root, "components", "hospital-filter.jsx"), "utf8");

  assert.match(source, /export function filterHospitalOptions/);
  assert.match(source, /if \(!normalizedQuery\) return hospitals/);
  assert.match(source, /hospital\.hospcode.*includes\(normalizedQuery\)/s);
  assert.match(source, /hospital\.hospname.*includes\(normalizedQuery\)/s);
  assert.match(source, /placeholder="ค้นหารหัสหรือชื่อหน่วยบริการ"/);
  assert.match(source, /const \[activeIndex, setActiveIndex\] = useState\(-1\)/);
  assert.match(source, /const visibleOptions = useMemo\(\(\) => \[/);
  assert.match(source, /const nextQuery = event\.target\.value/);
  assert.match(source, /const clearClickRef = useRef\(false\)/);
  assert.match(source, /const activeIndexRef = useRef\(-1\)/);
  assert.match(source, /event\.clientX >= right - 36/);
  assert.match(source, /if \(!isNativeClear && !String\(query \|\| ""\)\.trim\(\)\) setOpen\(true\)/);
  assert.match(source, /const clearedByNativeControl = clearClickRef\.current && !nextQuery/);
  assert.match(source, /setOpen\(clearedByNativeControl \? false : Boolean\(nextQuery\.trim\(\)\)\)/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "ArrowUp"/);
  assert.match(source, /const nextIndex = Math\.min\(activeIndexRef\.current \+ 1, visibleOptions\.length - 1\)/);
  assert.match(source, /event\.key === "Enter" && activeIndexRef\.current >= 0/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /aria-activedescendant=/);
});

test("HospitalFilter uses a high-contrast keyboard highlight", async () => {
  const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

  assert.match(css, /\.hospitalFilterOptions button\.hospitalFilterOptionActive\s*\{/);
  assert.match(css, /\.hospitalFilterOptions button\.hospitalFilterOptionActive\s*\{[^}]*background:\s*#0b6b45/s);
  assert.match(css, /\.hospitalFilterOptions button\.hospitalFilterOptionActive\s*\{[^}]*color:\s*#ffffff/s);
});

test("hospital selectors use the shared HospitalFilter component", async () => {
  const pages = [
    "app/quality/service-instype-err/page.js",
    "app/workload/visit-monthly/page.js",
    "app/workload/ncdscreen-workload/page.js",
    "app/quality/person-dup/page.js",
    "app/standard/person-pyramid/page.js",
    "app/dashboard/person-target/page.js",
    "app/target-group/kpi/page.js",
  ];

  for (const relativePath of pages) {
    const source = await readFile(path.join(root, relativePath), "utf8");
    assert.match(source, /import HospitalFilter from "@\/components\/hospital-filter"/);
    assert.match(source, /<HospitalFilter/);
  }
});
