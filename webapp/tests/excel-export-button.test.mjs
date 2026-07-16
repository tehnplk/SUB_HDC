import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("grid Excel exports use the shared ExcelExportButton", async () => {
  const files = [
    "app/workload/visit-monthly/page.js",
    "app/workload/ncdscreen-workload/page.js",
    "app/quality/person-dup/page.js",
    "app/rapid/dm-control/page.js",
    "app/rapid/mmr2/page.js",
    "app/rapid/screen-dm/page.js",
    "app/rapid/screen-ht/page.js",
    "app/target-group/kpi/page.js",
    "app/dashboard/report/page.js",
  ];

  const component = await readFile(path.join(root, "components", "excel-export-button.jsx"), "utf8");
  assert.match(component, /FileSpreadsheet/);
  assert.match(component, /ส่งออก Excel/);

  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /ExcelExportButton/);
  }
});
