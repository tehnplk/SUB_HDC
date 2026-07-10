import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const pagePath = path.resolve(process.cwd(), "app", "dashboard", "log-import", "page.js");
const routePath = path.resolve(process.cwd(), "app", "api", "dashboard", "route.js");
const cssPath = path.resolve(process.cwd(), "app", "globals.css");

test("log import page hides not_complete_msg column and reveals it from not_complate status", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /<th[^>]*>not_complete_msg<\/th>/);
  assert.match(source, /expandedErrorId/);
  assert.match(source, /row\.status === "not_complate"/);
  assert.match(source, /row\.not_complete_msg/);
});

test("log import page maps each import status to a semantic badge color class", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /function statusBadgeClass/);
  assert.match(source, /isComplete/);
  assert.match(source, /isPending/);
  assert.match(source, /isProcessing/);
  assert.match(source, /isNotComplete/);
});

test("log import page displays Thai labels for import status badges", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /function statusBadgeLabel/);
  assert.match(source, /row\.status === "pending"[\s\S]+รอนำเข้า/);
  assert.match(source, /row\.status === "processing"[\s\S]+กำลังนำเข้า/);
  assert.match(source, /row\.status === "complete"[\s\S]+สำเร็จ/);
  assert.match(source, /ไม่สำเร็จ/);
  assert.match(source, /statusBadgeLabel\(row\)/);
});

test("log import page flags a completed import that skipped rows as success with warning", async () => {
  const source = await readFile(pagePath, "utf8");
  const cssSource = await readFile(cssPath, "utf8");

  // complete + not_complete_msg => warning badge that opens the message row
  assert.match(source, /function hasWarning/);
  assert.match(source, /row\.status === "complete" && Boolean\(row\.not_complete_msg\)/);
  assert.match(source, /isWarning/);
  assert.match(source, /row\.status === "not_complate" \|\| hasWarning\(row\)/);
  assert.match(source, /<AlertTriangle aria-hidden="true" \/>/);
  assert.match(cssSource, /\.importStatusBadge\.isWarning/);
});

test("log import page shows elapsed import time in seconds from start to finish", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /function formatDurationSeconds/);
  assert.match(source, /finishMs - startMs/);
  assert.match(source, /Math\.round\(\(finishMs - startMs\) \/ 1000\)/);
  assert.match(source, /<th style={{ width: "110px" }}>เวลา<\/th>/);
  assert.match(source, /formatDurationSeconds\(row\.import_date_time, row\.finish_date_time\)/);
  assert.match(source, /colSpan=\{7\}/);
});

test("log import page reduces data grid font size by two pixels", async () => {
  const pageSource = await readFile(pagePath, "utf8");
  const cssSource = await readFile(cssPath, "utf8");

  assert.match(pageSource, /className="fileTable logImportTable"/);
  assert.match(cssSource, /\.logImportTable\s*\{[\s\S]*font-size:\s*12px/);
  assert.match(cssSource, /\.logImportTable th\s*\{[\s\S]*font-size:\s*10px/);
  assert.match(cssSource, /\.logImportTable \.importStatusBadge\s*\{[\s\S]*font-size:\s*11px/);
});

test("log import page keeps the file column close to id and prevents filename wrapping", async () => {
  const pageSource = await readFile(pagePath, "utf8");
  const cssSource = await readFile(cssPath, "utf8");

  assert.doesNotMatch(pageSource, />ชื่อไฟล์ที่นำเข้า<\/th>/);
  assert.match(pageSource, /<th>ไฟล์<\/th>/);
  assert.match(pageSource, /<th style={{ width: "70px" }}>#<\/th>/);
  assert.match(pageSource, /className="logImportFileCell"/);
  assert.doesNotMatch(pageSource, /wordBreak:\s*"break-all"/);
  assert.match(cssSource, /\.logImportTable \.logImportFileCell\s*\{[\s\S]*white-space:\s*nowrap/);
  assert.match(cssSource, /\.logImportTable \.logImportFileCell\s*\{[\s\S]*word-break:\s*normal/);
});

test("log import page shows processing percent in the status badge", async () => {
  const pageSource = await readFile(pagePath, "utf8");

  assert.match(pageSource, /function statusBadgeLabel\(row\)/);
  assert.match(pageSource, /row\.status === "processing"[\s\S]*Number\.isFinite\(row\.progress_percent\)/);
  assert.match(pageSource, /Math\.round\(row\.progress_percent\)/);
  assert.match(pageSource, /statusBadgeLabel\(row\)/);
});

test("log import grid shows file size after file name and falls back to dash", async () => {
  const pageSource = await readFile(pagePath, "utf8");
  const routeSource = await readFile(routePath, "utf8");

  assert.match(routeSource, /SELECT id, file_name, file_size, import_date_time/);
  assert.match(routeSource, /file_size: r\.file_size == null \? null : Number\(r\.file_size\)/);
  assert.match(pageSource, /function formatFileSize/);
  assert.match(pageSource, /if \(fileSize == null \|\| fileSize === ""\) return "-"/);
  assert.ok(pageSource.indexOf("<th>ไฟล์</th>") < pageSource.indexOf(">Size</th>"));
  assert.ok(pageSource.indexOf(">Size</th>") < pageSource.indexOf(">status</th>"));
  assert.match(pageSource, /<td>{formatFileSize\(row\.file_size\)}<\/td>/);
  assert.match(pageSource, /colSpan=\{7\}/);
});

test("log import page splits rows into waiting success and failed tabs with server counts", async () => {
  const pageSource = await readFile(pagePath, "utf8");
  const routeSource = await readFile(routePath, "utf8");
  const cssSource = await readFile(cssPath, "utf8");

  assert.match(pageSource, /const \[activeStatusTab, setActiveStatusTab\] = useState\("success"\)/);
  // tab filter ทำที่ SQL — หน้าส่ง status ไปกับ query แล้วแสดง counts จาก server
  assert.match(pageSource, /status: activeStatusTab/);
  assert.match(pageSource, /const counts = data\?\.counts/);
  assert.match(pageSource, /รอนำเข้า\(\{counts\.pending\}\)/);
  assert.match(pageSource, /สำเร็จ\(\{counts\.success\}\)/);
  assert.match(pageSource, /ไม่สำเร็จ\(\{counts\.failed\}\)/);
  assert.match(pageSource, /aria-pressed=\{activeStatusTab === "pending"\}/);
  assert.match(pageSource, /aria-pressed=\{activeStatusTab === "success"\}/);
  assert.match(pageSource, /aria-pressed=\{activeStatusTab === "failed"\}/);
  assert.match(routeSource, /success: \["complete"\]/);
  assert.match(routeSource, /failed: \["not_complate", "no_complete"\]/);
  assert.match(routeSource, /pending: \["pending", "processing"\]/);
  assert.match(cssSource, /\.logImportStatusTabs/);
  assert.match(cssSource, /\.logImportStatusTabActive/);
});

test("log import page lazy-loads 20 rows per page sorted by id desc", async () => {
  const pageSource = await readFile(pagePath, "utf8");
  const routeSource = await readFile(routePath, "utf8");

  // server-side pagination: LIMIT/OFFSET + default sort id ล่าสุดก่อน
  assert.match(routeSource, /const LOG_IMPORT_PAGE_SIZE = 20/);
  assert.match(routeSource, /ORDER BY id DESC/);
  assert.match(routeSource, /LIMIT \? OFFSET \?/);
  // หน้าเปลี่ยน page → fetch ใหม่ (lazy) + ปุ่มเลื่อนหน้าอยู่ล่างตาราง
  assert.match(pageSource, /page: String\(page\)/);
  assert.match(pageSource, /className="pagination"/);
  assert.match(pageSource, /หน้า \{page\} \/ \{totalPages\}/);
  assert.match(pageSource, /setPage\(page - 1\)/);
  assert.match(pageSource, /setPage\(page \+ 1\)/);
  // เปลี่ยน tab/คำค้น ต้องกลับหน้า 1
  assert.match(pageSource, /function switchTab/);
  assert.match(pageSource, /setPage\(1\)/);
});

test("log import page hides the total history label row", async () => {
  const pageSource = await readFile(pagePath, "utf8");

  assert.doesNotMatch(pageSource, /รายการประวัติการนำเข้าทั้งหมด/);
  assert.doesNotMatch(pageSource, /className="tableMeta metaLine"/);
});

test("log import status tabs show icons", async () => {
  const pageSource = await readFile(pagePath, "utf8");

  assert.match(pageSource, /Clock3,/);
  assert.match(pageSource, /CircleCheck,/);
  assert.match(pageSource, /CircleX,/);
  assert.match(pageSource, /<Clock3 aria-hidden="true" \/>[\s\S]*รอนำเข้า/);
  assert.match(pageSource, /<CircleCheck aria-hidden="true" \/>[\s\S]*สำเร็จ/);
  assert.match(pageSource, /<CircleX aria-hidden="true" \/>[\s\S]*ไม่สำเร็จ/);
});
