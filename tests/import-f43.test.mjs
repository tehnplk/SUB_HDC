import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

import AdmZip from "adm-zip";

const require = createRequire(import.meta.url);

async function withTempZip(entries, callback) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-import-"));
  const zipPath = path.join(dir, "sample.zip");
  const zip = new AdmZip();
  for (const [entryName, text] of Object.entries(entries)) {
    zip.addFile(entryName, Buffer.from(text, "utf8"));
  }
  zip.writeZip(zipPath);

  try {
    return await callback(zipPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("importer module exports helpers without running the CLI", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.equal(typeof importer.readF43Files, "function");
  assert.equal(typeof importer.importFile, "function");
});

test("readF43Files parses nested F43 text files", async () => {
  const importer = require("../lib/import_f43_node.js");

  await withTempZip(
    {
      "F43_11251/SERVICE.txt": "HOSPCODE|SEQ|DATE_SERV\r\n11251|1|20260101\r\n",
    },
    async (zipPath) => {
      const files = importer.readF43Files(zipPath, "original.zip");

      assert.equal(files.length, 1);
      assert.deepEqual(files[0], {
        fileName: "original.zip",
        tableName: "service",
        columns: ["hospcode", "seq", "date_serv"],
        rows: [["11251", "1", "20260101"]],
      });
    }
  );
});

test("importFile writes metadata file_name once using the source zip name", async () => {
  const importer = require("../lib/import_f43_node.js");
  const executed = [];
  const connection = {
    async execute(sql, values) {
      if (/^SHOW COLUMNS/i.test(sql)) {
        return [
          [
            { Field: "hospcode" },
            { Field: "seq" },
            { Field: "date_serv" },
            { Field: "file_name" },
            { Field: "import_date_time" },
          ],
        ];
      }
      executed.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
  };

  const result = await importer.importFile(
    connection,
    {
      tableName: "service",
      fileName: "source.zip",
      columns: ["hospcode", "seq", "date_serv", "file_name"],
      rows: [["11251", "1", "20260101", "inside.txt"]],
    },
    500,
    "error"
  );

  assert.equal(result.rows, 1);
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /`hospcode`, `seq`, `date_serv`, `file_name`/);
  assert.doesNotMatch(executed[0].sql, /`file_name`, `file_name`/);
  assert.deepEqual(executed[0].values, ["11251", "1", "20260101", "source.zip"]);
});

test("parseArgs requires an explicit zip path and validates numeric options", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.throws(
    () => importer.parseArgs(["node", "import_f43_node.js"], {}),
    /--zip is required/
  );
  assert.throws(
    () => importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip", "--batch-size", "0"], {}),
    /--batch-size must be a positive integer/
  );
  assert.throws(
    () => importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip", "--concurrency", "0"], {}),
    /--concurrency must be a positive integer/
  );
});
