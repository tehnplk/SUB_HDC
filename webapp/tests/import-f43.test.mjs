import assert from "node:assert/strict";
import crypto from "node:crypto";
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

test("importFile writes log_import_id metadata instead of source file columns", async () => {
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
            { Field: "log_import_id" },
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
    "error",
    undefined,
    42
  );

  assert.equal(result.rows, 1);
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /`hospcode`, `seq`, `date_serv`, `log_import_id`/);
  assert.doesNotMatch(executed[0].sql, /`file_name`, `file_name`/);
  assert.doesNotMatch(executed[0].sql, /`file_name`/);
  assert.deepEqual(executed[0].values, ["11251", "1", "20260101", 42]);
});

test("createLogImportFile stores the imported source zip name", async () => {
  const importer = require("../lib/import_f43_node.js");
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ insertId: 42 }];
    },
  };

  const id = await importer.createLogImportFile(connection, "source.zip");

  assert.equal(id, 42);
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /^INSERT INTO `log_import_file`/);
  assert.deepEqual(executed[0].values, ["source.zip"]);
});

test("encryptFileRows encrypts HOME house_id house and telephone with AES", () => {
  const importer = require("../lib/import_f43_node.js");
  const aesKey = Buffer.alloc(32, 1);

  const encrypted = importer.encryptFileRows(
    {
      tableName: "home",
      columns: ["hospcode", "hid", "house_id", "house", "telephone", "road"],
      rows: [["11251", "1", "HOUSE-1", "99/1", "0123456789", "main road"]],
    },
    aesKey
  );

  const [row] = encrypted.rows;
  assert.equal(row[0], "11251");
  assert.equal(row[1], "1");
  assert.notEqual(row[2], "HOUSE-1");
  assert.notEqual(row[3], "99/1");
  assert.notEqual(row[4], "0123456789");
  assert.equal(row[5], "main road");
  assert.match(row[2], /^[0-9a-f]+$/);
  assert.match(row[3], /^[0-9a-f]+$/);
  assert.match(row[4], /^[0-9a-f]+$/);
});

test("getAesKey uses ENCRYPT_KEY instead of SECRET_KEY", () => {
  const importer = require("../lib/import_f43_node.js");
  const key = importer.getAesKey({
    ENCRYPT_KEY: "encrypt-test-secret",
    SECRET_KEY: "old-secret",
  });
  const expected = crypto.createHash("sha256").update("encrypt-test-secret").digest();

  assert.deepEqual(key, expected);
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
