import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.resolve("app/api/import-zip/route.js");
const importerComponentPath = path.resolve("components/zip-importer.jsx");

test("import route uses low table concurrency to avoid MariaDB lock pressure", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /"--concurrency",\s*"4"/);
  assert.doesNotMatch(source, /"--concurrency",\s*"20"/);
});

test("import route uses the server-side queue before spawning import work", async () => {
  const source = await readFile(routePath, "utf8");
  const queueIndex = source.indexOf("importQueue.enqueue");
  const spawnIndex = source.indexOf("spawn(");

  assert.notEqual(queueIndex, -1);
  assert.notEqual(spawnIndex, -1);
  assert.ok(queueIndex < spawnIndex);
  assert.match(source, /IMPORT_QUEUE_FULL/);
});

test("import all runs uploaded zips in parallel after DB table guards are enabled", async () => {
  const source = await readFile(importerComponentPath, "utf8");
  const handleImportAllSource = source.slice(source.indexOf("async function handleImportAll()"));

  assert.match(handleImportAllSource, /Promise\.all\(/);
  assert.doesNotMatch(handleImportAllSource, /for \(const entry of pending\)/);
});

test("import page caps each user selection at 12 ZIP files and shows queue status", async () => {
  const source = await readFile(importerComponentPath, "utf8");

  assert.match(source, /const MAX_FILES = 12/);
  assert.match(source, /event\.type === "queued"/);
  assert.match(source, /event\.type === "started"/);
});
