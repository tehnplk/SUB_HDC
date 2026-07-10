import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildImportProcessArgs,
  createProgressTracker,
  isTransientImportFailure,
  pickReadyZip,
} = require("../lib/import_daemon.js");

const daemonPath = path.resolve(process.cwd(), "lib", "import_daemon.js");
const composePath = path.resolve(process.cwd(), "..", "docker-compose.yml");

test("daemon builds importer args with log id and error dir", () => {
  const args = buildImportProcessArgs({
    scriptPath: "/app/lib/import_f43_node.js",
    zipPath: "/app/tmp/import/processing/42__sample.zip",
    originalName: "sample.zip",
    logImportId: 42,
    errorDir: "/app/tmp/import/error/42",
  });

  assert.deepEqual(args, [
    "/app/lib/import_f43_node.js",
    "--zip",
    "/app/tmp/import/processing/42__sample.zip",
    "--file-name",
    "sample.zip",
    "--on-duplicate",
    "replace",
    "--concurrency",
    "4",
    "--progress",
    "--log-import-id",
    "42",
    "--error-dir",
    "/app/tmp/import/error/42",
  ]);
});

test("progress tracker pushes only changed percent values", () => {
  const updates = [];
  const track = createProgressTracker(7, (id, percent) => updates.push([id, percent]));

  track('{"type":"progress","percent":10}\n');
  track('{"type":"progress","percent":10}\n{"type":"progress","percent":25}\n');
  track("not json\n");
  track('{"type":"progress","percent":25.4}\n');

  assert.deepEqual(updates, [
    [7, 10],
    [7, 25],
  ]);
});

test("progress tracker handles events split across chunks", () => {
  const updates = [];
  const track = createProgressTracker(7, (id, percent) => updates.push(percent));

  track('{"type":"progress","per');
  track('cent":50}\n');

  assert.deepEqual(updates, [50]);
});

test("daemon claims zips from the queue before spawning the importer", async () => {
  const source = await readFile(daemonPath, "utf8");
  const processSource = source.slice(source.indexOf("async function processZip"));
  const claimIndex = processSource.indexOf("renameSync(queuePath, processingPath)");
  const spawnIndex = processSource.indexOf("runImportChild(");

  assert.notEqual(claimIndex, -1);
  assert.notEqual(spawnIndex, -1);
  assert.ok(claimIndex < spawnIndex);
});

test("daemon secure-deletes the zip after processing", async () => {
  const source = await readFile(daemonPath, "utf8");
  const finallyBlock = source.slice(source.indexOf("} finally {", source.indexOf("async function processZip")));

  assert.match(finallyBlock, /await secureDelete\(processingPath\)/);
});

test("daemon re-queues the zip instead of deleting when a worker is interrupted", async () => {
  const source = await readFile(daemonPath, "utf8");
  const processSource = source.slice(
    source.indexOf("async function processZip"),
    source.indexOf("function pickReadyZip")
  );

  // interrupted (code -1) → คืน ZIP กลับ queue + reset log, ไม่ secureDelete
  assert.match(processSource, /result\.code === -1/);
  assert.match(processSource, /requeueOnExit = true/);
  assert.match(processSource, /renameSync\(processingPath, path\.join\(dirs\.queueDir\(\), requeueName\)\)/);
  assert.match(processSource, /requeueLogImport\(logImportId\)/);
  // ไฟล์หย่อนมือ (ไม่มี prefix id__) ต้องถูก requeue ด้วยชื่อที่มี id — ไม่งั้น
  // รอบ retry สร้าง log row ใหม่ ทิ้ง row เดิมค้าง pending
  assert.match(processSource, /buildQueueFileName\(logImportId, entry\.baseName\)/);
  // DB ล่มชั่วคราวตอน resolveLogImport ต้อง requeue ไม่ใช่ลบไฟล์
  assert.match(processSource, /isTransientImportFailure\(error\.message\)/);
});

test("daemon watchdog SIGKILLs a hung import worker after a timeout", async () => {
  const source = await readFile(daemonPath, "utf8");
  const runChild = source.slice(
    source.indexOf("function runImportChild"),
    source.indexOf("async function processZip")
  );

  assert.match(runChild, /IMPORT_CHILD_TIMEOUT_MS/);
  assert.match(runChild, /child\.kill\("SIGKILL"\)/);
  assert.match(runChild, /clearTimeout\(watchdog\)/);
});

test("daemon treats a signal-killed worker (exit code null) as interrupted, not failed", async () => {
  const source = await readFile(daemonPath, "utf8");
  const runChild = source.slice(
    source.indexOf("function runImportChild"),
    source.indexOf("async function processZip")
  );

  // docker restart ส่ง SIGTERM → close(code=null, signal) — ต้อง map เป็น -1
  // ไม่งั้น ZIP โดนลบทั้งที่ import ไม่จบ (เคสข้อมูล job 330 หาย)
  assert.match(runChild, /\(code, signal\)/);
  assert.match(runChild, /signal !== null \|\| code === null/);
});

test("daemon caps transient re-queues so a broken network cannot loop forever", async () => {
  const source = await readFile(daemonPath, "utf8");

  assert.match(source, /IMPORT_MAX_REQUEUES/);
  assert.match(source, /requeueAttempts/);
  // เกิน cap → ปิดจ๊อบด้วยข้อความบอก re-upload (ไม่ปล่อยวนกินคิว)
  assert.match(source, /re-upload required/);
});

test("stale sweep is file-aware: only rows without a queue file and no active worker are marked", async () => {
  const source = await readFile(daemonPath, "utf8");
  const sweep = source.slice(
    source.indexOf("async function sweepStaleImports"),
    source.indexOf("function recoverProcessingZips")
  );

  // SELECT ก่อนแล้วกรองด้วยไฟล์จริง+worker ที่กำลังรัน — ไม่ UPDATE ดะตามเวลา
  assert.match(sweep, /collectQueuedImportIds\(\)/);
  assert.match(sweep, /activeImportIds\.has\(id\)/);
  assert.match(sweep, /queuedIds\.has\(id\)/);
  // helper สแกนทั้ง queue/ และ processing/
  const collect = source.slice(
    source.indexOf("function collectQueuedImportIds"),
    source.indexOf("async function sweepStaleImports")
  );
  assert.match(collect, /queueDir\(\)/);
  assert.match(collect, /processingDir\(\)/);
});

test("import settings default staleMinutes is short because the sweep is file-aware", async () => {
  const { IMPORT_SETTING_DEFAULTS } = await import("../lib/import-config.mjs");
  assert.equal(IMPORT_SETTING_DEFAULTS.staleMinutes, 30);
});

test("pickReadyZip picks the smallest ready zip so small uploads never wait behind big ones", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "import-queue-test-"));
  const queueDir = path.join(tmp, "tmp", "import", "queue");
  await mkdir(queueDir, { recursive: true });

  // ไฟล์ใหญ่มาก่อน (id 10) ไฟล์เล็กมาหลัง (id 20) — ต้องหยิบตัวเล็กก่อน
  await writeFile(path.join(queueDir, "10__big.zip"), Buffer.alloc(5000));
  await writeFile(path.join(queueDir, "20__small.zip"), Buffer.alloc(10));
  const aged = new Date(Date.now() - 60_000);
  await utimes(path.join(queueDir, "10__big.zip"), aged, aged);
  await utimes(path.join(queueDir, "20__small.zip"), aged, aged);
  // ไฟล์เล็กสุดแต่ mtime สดใหม่ (ยังไม่พ้น MIN_FILE_AGE_MS) — ต้องยังไม่ถูกหยิบ
  await writeFile(path.join(queueDir, "30__fresh.zip"), Buffer.alloc(1));

  const prevCwd = process.cwd();
  process.chdir(tmp);
  try {
    const picked = pickReadyZip();
    assert.equal(picked.name, "20__small.zip");
    assert.equal(picked.logImportId, 20);
  } finally {
    process.chdir(prevCwd);
    await rm(tmp, { recursive: true, force: true });
  }
});

test("isTransientImportFailure separates network errors from data errors", () => {
  // network/connection signatures → transient (ควร re-queue)
  assert.equal(isTransientImportFailure("connect ECONNREFUSED 10.0.4.1:3306"), true);
  assert.equal(isTransientImportFailure("Connection lost: The server closed the connection."), true);
  assert.equal(isTransientImportFailure("Can't add new command when connection is in closed state"), true);
  assert.equal(isTransientImportFailure("read ECONNRESET"), true);

  // data errors → fail จริง (ห้าม re-queue — retry ไปก็พังซ้ำ)
  assert.equal(isTransientImportFailure("Data too long for column 'house' at row 1"), false);
  assert.equal(isTransientImportFailure("3/52 แฟ้มไม่สำเร็จ: person — Incorrect integer value"), false);
  assert.equal(isTransientImportFailure(""), false);
  assert.equal(isTransientImportFailure(null), false);
});

test("requeueLogImport resets the log row back to pending for retry", async () => {
  const source = await readFile(daemonPath, "utf8");
  const fn = source.slice(
    source.indexOf("async function requeueLogImport"),
    source.indexOf("async function sweepStaleImports")
  );

  // backtick ในไฟล์อยู่ใน template literal จึงถูก escape เป็น \` — เผื่อไว้ใน pattern
  assert.match(fn, /status\\?`\s*=\s*'pending'/);
  assert.match(fn, /finish_date_time\\?`\s*=\s*NULL/);
  assert.match(fn, /import_date_time\\?`\s*=\s*CURRENT_TIMESTAMP/);
});

test("load-data import sets a net timeout before LOAD DATA to avoid hangs", async () => {
  const source = await readFile(
    path.resolve(process.cwd(), "lib", "import_f43_load_data.js"),
    "utf8"
  );

  assert.match(source, /net_read_timeout/);
  assert.match(source, /net_write_timeout/);
  assert.match(source, /IMPORT_LOAD_NET_TIMEOUT/);
});

test("docker compose runs the importer daemon as its own service on the webapp image", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /\n  importer:/);
  assert.match(compose, /container_name:\s*sub_hdc_importer/);
  assert.match(compose, /command:\s*node lib\/import_daemon\.js/);
  const importerBlock = compose.slice(compose.indexOf("\n  importer:"), compose.indexOf("\n  sync:"));
  assert.match(importerBlock, /image:\s*sub-hdc-webapp/);
  assert.match(importerBlock, /- \.\/webapp\/tmp:\/app\/tmp/);
});
