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
  assert.match(source, /status === "complete"[\s\S]+isComplete/);
  assert.match(source, /status === "pending"[\s\S]+isPending/);
  assert.match(source, /status === "processing"[\s\S]+isProcessing/);
  assert.match(source, /status === "not_complate"[\s\S]+isNotComplete/);
});

test("log import page displays Thai labels for import status badges", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /function statusBadgeLabel/);
  assert.match(source, /status === "pending"[\s\S]+รอนำเข้า/);
  assert.match(source, /status === "processing"[\s\S]+กำลังนำเข้า/);
  assert.match(source, /status === "complete"[\s\S]+สำเร็จ/);
  assert.match(source, /status === "not_complate"[\s\S]+ไม่สำเร็จ/);
  assert.match(source, /statusBadgeLabel\(row\.status, row\.progress_percent\)/);
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

  assert.match(pageSource, /function statusBadgeLabel\(status, progressPercent = null\)/);
  assert.match(pageSource, /status === "processing"[\s\S]*Number\.isFinite\(progressPercent\)/);
  assert.match(pageSource, /Math\.round\(progressPercent\)/);
  assert.match(pageSource, /statusBadgeLabel\(row\.status, row\.progress_percent\)/);
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
