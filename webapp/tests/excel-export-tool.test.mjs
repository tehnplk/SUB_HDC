import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  applyExcelExportLimit,
  MAX_EXCEL_EXPORT_ROWS,
  runExcelExportTool,
  sanitizeExcelFilename,
  userRequestedExcelExport,
} from "../lib/excel-export-tool.mjs";

test("applyExcelExportLimit caps SELECT exports", () => {
  assert.equal(
    applyExcelExportLimit("SELECT * FROM person"),
    `SELECT * FROM person LIMIT ${MAX_EXCEL_EXPORT_ROWS}`
  );
  assert.equal(applyExcelExportLimit("SELECT * FROM person LIMIT 10"), "SELECT * FROM person LIMIT 10");
  assert.equal(
    applyExcelExportLimit("SELECT * FROM person LIMIT 999999"),
    `SELECT * FROM person LIMIT ${MAX_EXCEL_EXPORT_ROWS}`
  );
});

test("sanitizeExcelFilename produces safe xlsx names", () => {
  assert.equal(sanitizeExcelFilename("report.xlsx"), "report.xlsx");
  assert.equal(sanitizeExcelFilename("../bad:name?.xlsx"), "bad-name.xlsx");
  assert.match(sanitizeExcelFilename(""), /^sub-hdc-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test("runExcelExportTool writes an Excel file from read-only SQL", async () => {
  const exportRoot = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-excel-test-"));
  const calls = [];

  try {
    const result = await runExcelExportTool(
      {
        sql: "SELECT diagcode, COUNT(*) AS cnt FROM diagnosis_opd GROUP BY diagcode LIMIT 2",
        filename: "disease-ranking.xlsx",
        sheetName: "Ranking",
      },
      async () => ({
        query(options) {
          calls.push(options);
          return [
            [
              { diagcode: "I10", cnt: 880n },
              { diagcode: "E119", cnt: 681n },
            ],
            [{ name: "diagcode" }, { name: "cnt" }],
          ];
        },
        end() {},
      }),
      { exportRoot }
    );

    assert.equal(result.ok, true);
    assert.equal(result.filename, "disease-ranking.xlsx");
    assert.equal(result.rowCount, 2);
    assert.equal(result.sheetName, "Ranking");
    assert.match(result.downloadUrl, /^\/api\/ai\/export\/.+\.xlsx$/);
    assert.equal(calls[0].sql, "SELECT diagcode, COUNT(*) AS cnt FROM diagnosis_opd GROUP BY diagcode LIMIT 2");

    const workbook = XLSX.read(await readFile(path.join(exportRoot, result.storedName)));
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Ranking);
    assert.deepEqual(rows, [
      { diagcode: "I10", cnt: "880" },
      { diagcode: "E119", cnt: "681" },
    ]);
  } finally {
    await rm(exportRoot, { recursive: true, force: true });
  }
});

test("userRequestedExcelExport only enables export for explicit requests", () => {
  assert.equal(userRequestedExcelExport([{ role: "user", content: "โรคที่พบมากสุด 10 อันดับ ปี 2569" }]), false);
  assert.equal(userRequestedExcelExport([{ role: "user", content: "export Excel โรคที่พบมากสุด 10 อันดับ ปี 2569" }]), true);
  assert.equal(userRequestedExcelExport([{ role: "user", content: "ดาวน์โหลด Excel ประชากรแยกชายหญิง" }]), true);
  assert.equal(userRequestedExcelExport([{ role: "user", content: "show table only, no export" }]), false);
});
