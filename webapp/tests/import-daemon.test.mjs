import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildImportProcessArgs, createProgressTracker } = require("../lib/import_daemon.js");

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

test("docker compose runs the importer daemon as its own service on the webapp image", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.match(compose, /\n  importer:/);
  assert.match(compose, /container_name:\s*sub_hdc_importer/);
  assert.match(compose, /command:\s*node lib\/import_daemon\.js/);
  const importerBlock = compose.slice(compose.indexOf("\n  importer:"), compose.indexOf("\n  sync:"));
  assert.match(importerBlock, /image:\s*sub-hdc-webapp/);
  assert.match(importerBlock, /- \.\/webapp\/tmp:\/app\/tmp/);
});
