import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildQueueFileName,
  parseQueueFileName,
} from "../lib/import-dirs.js";
import { createPendingLogImportFile, logImportOrderClause } from "../lib/log-import.mjs";

const routePath = path.resolve(process.cwd(), "app", "api", "import-zip", "route.js");

test("queue file names embed the log import id and parse back", () => {
  const name = buildQueueFileName(42, "abc-def_sample.zip");
  assert.equal(name, "42__abc-def_sample.zip");
  assert.deepEqual(parseQueueFileName(name), {
    logImportId: 42,
    baseName: "abc-def_sample.zip",
  });
});

test("queue file names without an id parse as manual drop-ins", () => {
  assert.deepEqual(parseQueueFileName("manual.zip"), {
    logImportId: null,
    baseName: "manual.zip",
  });
});

test("buildQueueFileName rejects invalid log import ids", () => {
  assert.throws(() => buildQueueFileName(0, "a.zip"));
  assert.throws(() => buildQueueFileName("x", "a.zip"));
});

test("logImportOrderClause keeps processing rows above pending rows", () => {
  assert.match(logImportOrderClause(), /WHEN 'processing' THEN 0/);
  assert.match(logImportOrderClause(), /WHEN 'pending' THEN 1/);
});

test("createPendingLogImportFile stores the queued zip file size", async () => {
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ insertId: 42 }];
    },
  };

  const id = await createPendingLogImportFile(connection, "queued.zip", 2048);

  assert.equal(id, 42);
  assert.match(executed[0].sql, /`file_name`, `file_size`, `status`/);
  assert.deepEqual(executed[0].values, ["queued.zip", 2048, "pending"]);
});

test("import route only enqueues to the directory queue and never spawns import work", async () => {
  const source = await readFile(routePath, "utf8");

  assert.doesNotMatch(source, /spawn\(/);
  assert.doesNotMatch(source, /import_f43_node/);
  assert.match(source, /buildQueueFileName\(logImportId, storedName\)/);
  assert.match(source, /await rename\(zipPath, queuedPath\)/);
});

test("import route creates the pending log row before moving the zip into the queue", async () => {
  const source = await readFile(routePath, "utf8");
  const postSource = source.slice(source.indexOf("export async function POST"));
  const logIndex = postSource.indexOf("createPendingLog(");
  const renameIndex = postSource.indexOf("await rename(");

  assert.notEqual(logIndex, -1);
  assert.notEqual(renameIndex, -1);
  assert.ok(logIndex < renameIndex);
});

test("import route deletes the uploaded zip when the queue is full", async () => {
  const source = await readFile(routePath, "utf8");
  const queueFullBlock = source.slice(
    source.indexOf("if (active + pending >= settings.queueCapacity)"),
    source.indexOf("const logImportId")
  );

  assert.match(queueFullBlock, /await secureDelete\(zipPath\)/);
  assert.match(queueFullBlock, /IMPORT_QUEUE_FULL/);
});
