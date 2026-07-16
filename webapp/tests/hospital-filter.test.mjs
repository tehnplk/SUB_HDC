import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("HospitalFilter shows all hospitals before typing and filters code or name immediately", async () => {
  const source = await readFile(path.join(root, "components", "hospital-filter.jsx"), "utf8");

  assert.match(source, /export function filterHospitalOptions/);
  assert.match(source, /if \(!normalizedQuery\) return hospitals/);
  assert.match(source, /hospital\.hospcode.*includes\(normalizedQuery\)/s);
  assert.match(source, /hospital\.hospname.*includes\(normalizedQuery\)/s);
  assert.match(source, /placeholder="ค้นหารหัสหรือชื่อหน่วยบริการ"/);
  assert.match(source, /const \[activeIndex, setActiveIndex\] = useState\(-1\)/);
  assert.match(source, /const visibleOptions = useMemo\(\(\) => \[/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "ArrowUp"/);
  assert.match(source, /event\.key === "Enter" && activeIndex >= 0/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /aria-activedescendant=/);
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
