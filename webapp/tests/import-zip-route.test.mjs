import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildImportProcessArgs,
  createImportProgressWriter,
} from "../app/api/import-zip/route.js";
import { clearImportProgress, getImportProgressPercent } from "../lib/import-progress.mjs";
import { logImportOrderClause } from "../lib/log-import.mjs";

const routePath = path.resolve(process.cwd(), "app", "api", "import-zip", "route.js");

test("buildImportProcessArgs passes existing log import id to the importer", () => {
  const args = buildImportProcessArgs({
    scriptPath: "/app/lib/import_f43_node.js",
    zipPath: "/app/tmp/uploads/sample.zip",
    originalName: "sample.zip",
    logImportId: 42,
  });

  assert.deepEqual(args, [
    "/app/lib/import_f43_node.js",
    "--zip",
    "/app/tmp/uploads/sample.zip",
    "--file-name",
    "sample.zip",
    "--on-duplicate",
    "replace",
    "--concurrency",
    "4",
    "--progress",
    "--log-import-id",
    "42",
  ]);
});

test("logImportOrderClause keeps processing rows above pending rows", () => {
  assert.match(logImportOrderClause(), /WHEN 'processing' THEN 0/);
  assert.match(logImportOrderClause(), /WHEN 'pending' THEN 1/);
});

test("import route deletes uploaded zip immediately when the queue rejects import", async () => {
  const source = await readFile(routePath, "utf8");
  const queueFullBlock = source.slice(
    source.indexOf("if (!importQueue.canAccept())"),
    source.indexOf("if (background)")
  );
  const backgroundCatchBlock = source.slice(
    source.indexOf("Background import failed:"),
    source.indexOf("return Response.json({", source.indexOf("Background import failed:"))
  );

  assert.match(queueFullBlock, /await secureDelete\(zipPath\)/);
  assert.match(backgroundCatchBlock, /secureDelete\(zipPath\)/);
});

test("import route captures progress percent from importer stdout", () => {
  clearImportProgress(42);
  const output = [];
  const writeProgress = createImportProgressWriter({
    logImportId: 42,
    writeStdout: (chunk) => output.push(chunk),
  });

  writeProgress('{"type":"progress","percent":64}\n');

  assert.equal(getImportProgressPercent(42), 64);
  assert.deepEqual(output, ['{"type":"progress","percent":64}\n']);
});
