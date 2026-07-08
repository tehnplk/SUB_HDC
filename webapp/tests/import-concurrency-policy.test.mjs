import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const daemonPath = path.resolve("lib/import_daemon.js");
const routePath = path.resolve("app/api/import-zip/route.js");
const importerComponentPath = path.resolve("components/zip-importer.jsx");

test("import daemon uses low table concurrency to avoid MariaDB lock pressure", async () => {
  const source = await readFile(daemonPath, "utf8");

  assert.match(source, /"--concurrency",\s*"4"/);
  assert.doesNotMatch(source, /"--concurrency",\s*"20"/);
});

test("import route rejects new zips when the directory queue is full", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /settings\.queueCapacity/);
  assert.match(source, /IMPORT_QUEUE_FULL/);
});

test("import daemon limits simultaneous zip imports to the configured concurrency", async () => {
  const source = await readFile(daemonPath, "utf8");

  assert.match(source, /running < settings\.queueConcurrency/);
});

test("import all runs uploaded zips in parallel after DB table guards are enabled", async () => {
  const source = await readFile(importerComponentPath, "utf8");
  const handleImportAllSource = source.slice(source.indexOf("async function handleImportAll()"));

  assert.match(handleImportAllSource, /Promise\.all\(/);
  assert.doesNotMatch(handleImportAllSource, /for \(const entry of pending\)/);
});

test("import page caps each user selection at 12 ZIP files", async () => {
  const source = await readFile(importerComponentPath, "utf8");

  assert.match(source, /const MAX_FILES = 12/);
});

test("import page hands zips to the queue and does not stream import progress", async () => {
  const source = await readFile(importerComponentPath, "utf8");
  const importZipSource = source.slice(
    source.indexOf("async function importZip(entry)"),
    source.indexOf("// ── Handle file selection ──")
  );

  assert.match(importZipSource, /\/api\/import-zip/);
  assert.doesNotMatch(importZipSource, /getReader\(\)/);
  assert.doesNotMatch(importZipSource, /background: true/);
});
