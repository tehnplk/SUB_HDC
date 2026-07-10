import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function withTempConfig(config, callback) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-import-config-"));
  const configPath = path.join(dir, "config.json");
  await writeFile(configPath, JSON.stringify(config), "utf8");

  try {
    return await callback(configPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("importer module exports helpers without running the CLI", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.equal(typeof importer.readF43Files, "function");
  assert.equal(typeof importer.importFileWithLoadData, "function");
  assert.equal(importer.importFile, undefined);
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
        headerLine: "HOSPCODE|SEQ|DATE_SERV",
        rows: [["11251", "1", "20260101"]],
        invalidLines: [],
      });
    }
  );
});

test("readF43Files collects malformed rows instead of failing the whole file", async () => {
  const importer = require("../lib/import_f43_node.js");

  await withTempZip(
    {
      "F43_11251/LABFU.txt":
        "HOSPCODE|SEQ|DATE_SERV\r\n11251|1|20260101\r\n11251|broken\r\n11251|2|20260102\r\n11251|3|20260103|extra\r\n",
    },
    async (zipPath) => {
      const files = importer.readF43Files(zipPath, "original.zip");

      assert.equal(files.length, 1);
      assert.deepEqual(files[0].rows, [
        ["11251", "1", "20260101"],
        ["11251", "2", "20260102"],
      ]);
      assert.deepEqual(files[0].invalidLines, [
        { line: 3, raw: "11251|broken" },
        { line: 5, raw: "11251|3|20260103|extra" },
      ]);
    }
  );
});

test("writeInvalidRowFiles writes {TABLE}_ERROR.txt with header and raw rows", async () => {
  const importer = require("../lib/import_f43_node.js");
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-error-"));

  try {
    const skipped = importer.writeInvalidRowFiles(
      [
        {
          tableName: "labfu",
          headerLine: "HOSPCODE|SEQ|DATE_SERV",
          invalidLines: [{ line: 3, raw: "11251|broken" }],
        },
        { tableName: "service", headerLine: "HOSPCODE|SEQ", invalidLines: [] },
      ],
      dir
    );

    assert.deepEqual(skipped, [{ table: "labfu", count: 1, lines: [3] }]);
    const content = await readFile(path.join(dir, "LABFU_ERROR.txt"), "utf8");
    assert.equal(content, "HOSPCODE|SEQ|DATE_SERV\n11251|broken\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("guessCanonicalTable strips hospcode/timestamp suffix using real table names", () => {
  const importer = require("../lib/import_f43_node.js");
  const tables = ["accident", "drug", "drug_opd", "drugallergy", "charge_ipd"];

  // simple name with suffix
  assert.equal(importer.guessCanonicalTable("accident_07487_20251001085344", tables), "accident");
  // prefers the longest matching prefix so drug_opd wins over drug
  assert.equal(importer.guessCanonicalTable("drug_opd_07487_20251001", tables), "drug_opd");
  // does not match a bare prefix of a longer table (drug !~ drugallergy)
  assert.equal(importer.guessCanonicalTable("drugallergy_07487_1", tables), "drugallergy");
  // exact name (no suffix) still resolves
  assert.equal(importer.guessCanonicalTable("charge_ipd", tables), "charge_ipd");
  // nothing matches -> null
  assert.equal(importer.guessCanonicalTable("unknownfile_123", tables), null);
});

test("getExistingColumns turns a missing table into a Thai file-name warning", async () => {
  const importer = require("../lib/import_f43_node.js");
  const connection = {
    async execute(sql) {
      if (/^SHOW COLUMNS/i.test(sql)) {
        const err = new Error("Table 'sub_hdc.accident_07487_20251001085344' doesn't exist");
        err.code = "ER_NO_SUCH_TABLE";
        throw err;
      }
      if (/from c_file/i.test(sql)) {
        return [[{ file_name: "accident" }, { file_name: "drug_opd" }]];
      }
      throw new Error(`unexpected: ${sql}`);
    },
  };

  await assert.rejects(
    () => importer.getExistingColumns(connection, "accident_07487_20251001085344"),
    (error) => {
      assert.match(error.message, /ชื่อไฟล์ในซิปไม่ตรงชื่อแฟ้มมาตรฐาน/);
      assert.match(error.message, /"accident_07487_20251001085344\.txt"/);
      assert.match(error.message, /ควรเป็น "accident\.txt"/);
      assert.match(error.message, /export ไฟล์ใหม่/);
      return true;
    }
  );
});

test("getExistingColumns rethrows non-missing-table errors untouched", async () => {
  const importer = require("../lib/import_f43_node.js");
  const connection = {
    async execute() {
      const err = new Error("Connection lost");
      err.code = "PROTOCOL_CONNECTION_LOST";
      throw err;
    },
  };

  await assert.rejects(
    () => importer.getExistingColumns(connection, "service"),
    /Connection lost/
  );
});

test("formatSkippedSummary lists skipped row numbers per table", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.equal(importer.formatSkippedSummary([]), null);
  assert.equal(
    importer.formatSkippedSummary([
      { table: "labfu", count: 3, lines: [1, 2, 6] },
      { table: "service", count: 3, lines: [5, 7, 101] },
    ]),
    "labfu > row 1, 2, 6\nservice > row 5, 7, 101"
  );
});

test("formatSkippedSummary caps the listed rows and reports the remainder", () => {
  const importer = require("../lib/import_f43_node.js");
  const lines = Array.from({ length: 53 }, (_, i) => i + 1);

  const summary = importer.formatSkippedSummary([{ table: "labfu", count: 53, lines }]);
  assert.match(summary, /^labfu > row 1, 2, .*50 \.\.\. \(\+3\)$/);
});

test("truncateRowsToColumnWidths trims over-long text and reports affected columns", () => {
  const importer = require("../lib/import_f43_node.js");
  const file = {
    columns: ["hospcode", "hosp_rx", "cid"],
    rows: [
      ["07488", "abcdefghij", "1"],
      ["07488", "short", "2"],
      ["07488", "0123456789X", "3"],
    ],
  };
  const maxLengths = new Map([
    ["hosp_rx", 5],
    ["cid", 13],
  ]);

  const truncated = importer.truncateRowsToColumnWidths(file, maxLengths);

  assert.deepEqual(file.rows, [
    ["07488", "abcde", "1"],
    ["07488", "short", "2"],
    ["07488", "01234", "3"],
  ]);
  assert.deepEqual(truncated, [{ column: "hosp_rx", count: 2 }]);
});

test("truncateRowsToColumnWidths counts characters, not bytes, and keeps code points whole", () => {
  const importer = require("../lib/import_f43_node.js");
  const file = {
    columns: ["note"],
    rows: [["กขคง๒๒"]],
  };
  // 6 characters; cap at 4 characters -> keep first 4, drop the rest
  const truncated = importer.truncateRowsToColumnWidths(file, new Map([["note", 4]]));

  assert.equal([...file.rows[0][0]].length, 4);
  assert.equal(file.rows[0][0], "กขคง");
  assert.deepEqual(truncated, [{ column: "note", count: 1 }]);
});

test("buildWarningMessage combines skipped rows and truncated fields", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.equal(importer.buildWarningMessage([], new Map()), null);

  const message = importer.buildWarningMessage(
    [{ table: "epi", count: 2, lines: [4, 5] }],
    new Map([["chronic", [{ column: "hosp_rx", count: 3 }]]])
  );
  assert.equal(message, "epi > row 4, 5\nchronic.hosp_rx ตัด 3 แถว");
});

test("load-data import writes log_import_id metadata instead of source file columns", async () => {
  const loader = require("../lib/import_f43_load_data.js");
  let loadedSource = "";
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
      throw new Error(`Unexpected execute: ${sql} ${values}`);
    },
    async query(sql) {
      // importFile ตั้ง net_read/write_timeout ต่อ session ก่อน LOAD DATA
      // กัน connection แขวนตอน network สะดุด — ข้าม statement นั้นในการตรวจ
      if (/^SET SESSION/i.test(sql.trim())) {
        return [{}];
      }
      const match = sql.match(/LOAD DATA LOCAL INFILE '([^']+)'/);
      assert.ok(match);
      loadedSource = await readFile(match[1], "utf8");
      return [{ affectedRows: 1 }];
    },
  };

  await withTempZip({}, async (zipPath) => {
    const result = await loader.importFile(
      connection,
      {
        tableName: "service",
        fileName: "source.zip",
        columns: ["hospcode", "seq", "date_serv", "file_name"],
        rows: [["11251", "1", "20260101", "inside.txt"]],
      },
      500,
      "replace",
      undefined,
      42,
      { tmpDir: path.dirname(zipPath) }
    );

    assert.equal(result.rows, 1);
  });

  assert.equal(loadedSource, "11251|1|20260101|42\n");
});

test("load-data import adds table column context to MySQL errors", async () => {
  const loader = require("../lib/import_f43_load_data.js");
  const connection = {
    async execute(sql) {
      if (/^SHOW COLUMNS/i.test(sql)) {
        return [
          [
            { Field: "hospcode" },
            { Field: "hid" },
            { Field: "house" },
          ],
        ];
      }
      throw new Error(`Unexpected execute: ${sql}`);
    },
    async query(sql) {
      if (/^SET SESSION/i.test(sql.trim())) {
        return [{}];
      }
      const error = new Error("Data too long for column 'house' at row 1");
      error.code = "ER_DATA_TOO_LONG";
      throw error;
    },
  };

  await withTempZip({}, async (zipPath) => {
    await assert.rejects(
      () => loader.importFile(
        connection,
        {
          tableName: "home",
          fileName: "source.zip",
          columns: ["hospcode", "hid", "house"],
          rows: [["11251", "1", "99/1"]],
        },
        500,
        "replace",
        undefined,
        42,
        { tmpDir: path.dirname(zipPath) }
      ),
      /table=home/
    );
  });
});

test("legacy insert import is available only as a separate importer file", () => {
  const importer = require("../lib/import_f43_node.js");
  const inserter = require("../lib/import_f43_insert.js");

  assert.equal(importer.importFile, undefined);
  assert.equal(importer.buildInsert, undefined);
  assert.equal(typeof inserter.importFile, "function");
  assert.equal(typeof inserter.buildInsert, "function");
});

test("parseArgs reads import method from config.json", async () => {
  const importer = require("../lib/import_f43_node.js");

  await withTempConfig({ import: { method: "insert" } }, async (configPath) => {
    assert.equal(
      importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip"], {
        IMPORT_CONFIG_PATH: configPath,
      }).method,
      "insert"
    );
  });

  await withTempConfig({ import: { method: "load-data" } }, async (configPath) => {
    assert.equal(
      importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip"], {
        IMPORT_CONFIG_PATH: configPath,
      }).method,
      "load-data"
    );
  });
});

test("parseArgs requires a valid import method in config.json without fallback", async () => {
  const importer = require("../lib/import_f43_node.js");

  await withTempConfig({}, async (configPath) => {
    assert.throws(
      () => importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip"], {
        IMPORT_CONFIG_PATH: configPath,
      }),
      /config\.json import\.method is required/
    );
  });

  await withTempConfig({ import: { method: "bulk" } }, async (configPath) => {
    assert.throws(
      () => importer.parseArgs(["node", "import_f43_node.js", "--zip", "sample.zip"], {
        IMPORT_CONFIG_PATH: configPath,
      }),
      /config\.json import\.method must be insert or load-data/
    );
  });
});

test("createLogImportFile stores the source zip name size and pending status", async () => {
  const importer = require("../lib/import_f43_node.js");
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ insertId: 42 }];
    },
  };

  const id = await importer.createLogImportFile(connection, "source.zip", 1536);

  assert.equal(id, 42);
  assert.equal(executed.length, 1);
  assert.match(executed[0].sql, /^INSERT INTO `log_import_file`/);
  assert.match(executed[0].sql, /`file_size`/);
  assert.match(executed[0].sql, /`status`/);
  assert.deepEqual(executed[0].values, ["source.zip", 1536, "pending"]);
});

test("updateLogImportFileStatus stamps processing complete and not_complate states", async () => {
  const importer = require("../lib/import_f43_node.js");
  const executed = [];
  const connection = {
    async execute(sql, values) {
      executed.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
  };

  await importer.updateLogImportFileStatus(connection, 42, "processing");
  await importer.updateLogImportFileStatus(connection, 42, "complete");
  await importer.updateLogImportFileStatus(connection, 42, "not_complate", "home: failed");

  assert.equal(executed.length, 3);
  assert.match(executed[0].sql, /status` = \?/);
  assert.match(executed[0].sql, /`finish_date_time` = NULL/);
  assert.deepEqual(executed[0].values, ["processing", null, 42]);

  assert.match(executed[1].sql, /CURRENT_TIMESTAMP/);
  assert.deepEqual(executed[1].values, ["complete", null, 42]);

  assert.match(executed[2].sql, /CURRENT_TIMESTAMP/);
  assert.deepEqual(executed[2].values, ["not_complate", "home: failed", 42]);
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

test("encryptFileRows encrypts ADDRESS house_id with AES", () => {
  const importer = require("../lib/import_f43_node.js");
  const aesKey = Buffer.alloc(32, 1);

  const encrypted = importer.encryptFileRows(
    {
      tableName: "address",
      columns: ["hospcode", "pid", "addresstype", "house_id", "houseno"],
      rows: [["11251", "1", "1", "HOUSE-1", "99/1"]],
    },
    aesKey
  );

  const [row] = encrypted.rows;
  assert.equal(row[0], "11251");
  assert.equal(row[1], "1");
  assert.equal(row[2], "1");
  assert.notEqual(row[3], "HOUSE-1");
  assert.notEqual(row[4], "99/1");
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

test("parseArgs rejects method CLI overrides because config.json controls method", () => {
  const importer = require("../lib/import_f43_node.js");

  assert.throws(
    () => importer.parseArgs([
      "node",
      "import_f43_node.js",
      "--zip",
      "sample.zip",
      "--method",
      "insert",
    ], {}),
    /Unknown argument: --method/
  );
  assert.throws(
    () => importer.parseArgs([
      "node",
      "import_f43_node.js",
      "--zip",
      "sample.zip",
      "--method",
      "bulk",
    ], {}),
    /Unknown argument: --method/
  );
});

test("parseArgs accepts an existing log import id for background imports", () => {
  const importer = require("../lib/import_f43_node.js");

  const args = importer.parseArgs([
    "node",
    "import_f43_node.js",
    "--zip",
    "sample.zip",
    "--log-import-id",
    "42",
  ], {});

  assert.equal(args.logImportId, 42);
  assert.throws(
    () => importer.parseArgs([
      "node",
      "import_f43_node.js",
      "--zip",
      "sample.zip",
      "--log-import-id",
      "0",
    ], {}),
    /--log-import-id must be a positive integer/
  );
});

test("withTableImportLock uses MariaDB advisory locks without locking tables", async () => {
  const importer = require("../lib/import_f43_node.js");
  const calls = [];
  const connection = {
    async execute(sql, values) {
      calls.push({ sql, values });
      if (/GET_LOCK/i.test(sql)) return [[{ acquired: 1 }]];
      if (/RELEASE_LOCK/i.test(sql)) return [[{ released: 1 }]];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await importer.withTableImportLock(connection, "sub_hdc", "service", 30, async () => {
    calls.push({ work: true });
    return "imported";
  });

  assert.equal(result, "imported");
  assert.match(calls[0].sql, /GET_LOCK/);
  assert.deepEqual(calls[0].values, ["sub_hdc_import_253d2b77edc791032f1af052595254cc5a33f132", 30]);
  assert.deepEqual(calls[1], { work: true });
  assert.match(calls[2].sql, /RELEASE_LOCK/);
  assert.deepEqual(calls[2].values, ["sub_hdc_import_253d2b77edc791032f1af052595254cc5a33f132"]);
  assert.doesNotMatch(calls.map((call) => call.sql || "").join("\n"), /LOCK TABLES/i);
});

test("withTableImportLock releases the advisory lock when import work fails", async () => {
  const importer = require("../lib/import_f43_node.js");
  const calls = [];
  const connection = {
    async execute(sql, values) {
      calls.push({ sql, values });
      if (/GET_LOCK/i.test(sql)) return [[{ acquired: 1 }]];
      if (/RELEASE_LOCK/i.test(sql)) return [[{ released: 1 }]];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  await assert.rejects(
    () => importer.withTableImportLock(connection, "sub_hdc", "person", 30, async () => {
      throw new Error("import failed");
    }),
    /import failed/
  );

  assert.match(calls.at(-1).sql, /RELEASE_LOCK/);
});

test("import runner continues past a failed file and aggregates failures", async () => {
  const source = await readFile(new URL("../lib/import_f43_node.js", import.meta.url), "utf8");

  // แฟ้มที่พังถูกเก็บเข้า failures แล้วไปแฟ้มถัดไป ไม่ reject ทั้งงานตั้งแต่ error แรก
  assert.match(source, /failures\.push\(\{ table: files\[index\]\.tableName, message: error\.message \}\)/);
  assert.doesNotMatch(source, /\.catch\(reject\)/);
  assert.match(source, /type: "table_error"/);
  assert.match(source, /แฟ้มไม่สำเร็จ/);
});

test("buildLoadDataSql uses local infile replace with utf8mb4 and pipe fields", () => {
  const loader = require("../lib/import_f43_load_data.js");

  const sql = loader.buildLoadDataSql(
    "service",
    ["hospcode", "seq", "date_serv", "log_import_id"],
    "C:/tmp/sub-hdc-load/service.tsv",
    "replace"
  );

  assert.match(sql, /^LOAD DATA LOCAL INFILE 'C:\/tmp\/sub-hdc-load\/service.tsv'/);
  assert.match(sql, /REPLACE INTO TABLE `service`/);
  assert.match(sql, /CHARACTER SET utf8mb4/);
  assert.match(sql, /FIELDS TERMINATED BY '\|' ESCAPED BY ''/);
  assert.match(sql, /LINES TERMINATED BY '\\n'/);
  assert.match(sql, /\(`hospcode`, `seq`, `date_serv`, `log_import_id`\)/);
});

test("writeLoadDataTempFile writes encrypted Thai-safe UTF-8 rows with log_import_id", async () => {
  const loader = require("../lib/import_f43_load_data.js");

  await withTempZip({}, async (zipPath) => {
    const tmpDir = path.dirname(zipPath);
    const tempPath = await loader.writeLoadDataTempFile(
      tmpDir,
      {
        tableName: "service",
        columns: ["hospcode", "seq", "chiefcomp"],
        rows: [["11251", "1", "อาการไอ"]],
      },
      ["hospcode", "seq", "chiefcomp", "log_import_id"],
      42
    );

    const source = await readFile(tempPath, "utf8");

    assert.equal(source, "11251|1|อาการไอ|42\n");
  });
});
