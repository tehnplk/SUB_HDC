import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("grid Excel exports use the shared ExcelExportButton", async () => {
  const files = [
    "app/quality/person-dup/page.js",
  ];

  const component = await readFile(path.join(root, "components", "excel-export-button.jsx"), "utf8");
  assert.match(component, /FileSpreadsheet/);
  assert.match(component, /ส่งออก Excel/);

  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /ExcelExportButton/);
  }
});
