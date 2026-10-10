import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("quality portal links to the SPECIALPP code-error report", async () => {
  const page = await readFile(path.join(root, "app", "dashboard", "quality", "page.js"), "utf8");
  assert.match(page, /href="\/quality\/specialpp-error"/);
  assert.match(page, /บันทึกรหัสคัดกรอง SPECIAL PP ที่ไม่ตรงรหัสมาตรฐานหรือยกเลิกไปแล้ว \(SPECIALPP - PPSPECIAL\)/);
});

test("SPECIALPP code-error report splits not-standard and cancelled counts and opens details", async () => {
  const [page, route] = await Promise.all([
    readFile(path.join(root, "app", "quality", "specialpp-error", "page.js"), "utf8"),
    readFile(path.join(root, "app", "api", "quality", "specialpp-error", "route.js"), "utf8"),
  ]);

  assert.match(page, /<AffiliationFilter/);
  assert.match(page, /filterGrid qualityFilters/);
  assert.match(page, /params\.set\("fiscalYear", fiscalYear\)/);
  assert.match(page, /<FiscalYearFilter/);
  assert.match(page, /onChange=\{\(year\) => \{ setFiscalYear\(year\); setAffiliation\(""\); setHospcode\(""\); \}\}/);
  assert.match(page, /if \(!fiscalYear && payload\.fiscalYear\) setFiscalYear\(String\(payload\.fiscalYear\)\)/);
  assert.match(page, /params\.set\("hospcode", hospcode\)/);
  assert.match(page, /ไม่ตรงรหัสมาตรฐาน/);
  assert.match(page, /รหัสยกเลิกแล้ว/);
  assert.match(page, /ชื่อรหัส/);
  // ปีงบ/หน่วยบริการ/สังกัด ตรวจใน resolveReportScope (ดู report.test.mjs)
  assert.match(route, /tables: \["t_specialpp_error"\]/);
  assert.match(route, /hospitalsPerYear: true/);
  assert.match(route, /affiliationSource: "depShort"/);
  assert.match(route, /if \(scope\.badRequest\) return scope\.badRequest/);
  assert.match(route, /searchParams\.get\("details"\) === "1"/);
  assert.match(route, /SUM\(error_type = 'not_standard'\) AS not_standard/);
  assert.match(route, /SUM\(error_type = 'cancelled'\) AS cancelled/);
  assert.match(route, /COUNT\(\*\) AS total/);
  assert.match(route, /GROUP BY hospcode/);
  assert.match(route, /ORDER BY date_serve DESC/);
  assert.match(route, /FROM \\`t_specialpp_error\\`/);
  assert.match(page, /tableCountButton/);
  assert.match(page, /openDetails/);
  assert.match(page, /reportModalBackdrop/);
  assert.match(page, /dataSourceLabel/);
  assert.match(page, /ExcelExportButton/);
  assert.match(page, /exportHrefFor\(row\.hospcode\)/);
  assert.match(page, /specialppErrorTable/);
  assert.match(page, /specialppActionCol/);
  assert.match(page, /t_specialpp_error/);
  assert.match(page, /processedAt/);
  assert.match(route, /latestTransformAt\(conn, "t_specialpp_error\.sql"\)/);
  assert.match(route, /transformedAt/);
});

test("SPECIALPP code-error export reuses the filtered details of the report handler and omits cid", async () => {
  const [route, exportRoute] = await Promise.all([
    readFile(path.join(root, "app", "api", "quality", "specialpp-error", "route.js"), "utf8"),
    readFile(path.join(root, "app", "api", "quality", "specialpp-error", "export", "route.js"), "utf8"),
  ]);
  assert.match(exportRoute, /fetchReport\(getSpecialppError, request, \{ details: "1" \}\)/);
  assert.match(route, /if \(!scope\.hospcode\)/);
  assert.match(exportRoute, /xlsxResponse\(COLUMNS, data\.rows/);
  assert.match(exportRoute, /specialpp_error_\$\{data\.fiscalYear\}_\$\{hospcode\}\.xlsx/);
  assert.doesNotMatch(exportRoute, /\bcid\b/);
});

test("SPECIALPP transform reads specialpp against the c_specialpp_ppspecial lookup", async () => {
  const sql = await readFile(path.join(root, "..", "transform", "sql", "t_specialpp_error.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `t_specialpp_error`/);
  assert.match(sql, /FROM `specialpp` s/);
  assert.match(sql, /LEFT JOIN `c_specialpp_ppspecial` c/);
  assert.match(sql, /'not_standard'/);
  assert.match(sql, /'cancelled'/);
  assert.match(sql, /c\.`is_active` = 0/);
  assert.match(sql, /COALESCE\(c\.`ppspecial_name`, ''\) AS `ppspecial_name`/);
  assert.match(sql, /utf8mb3_general_ci/);
});
