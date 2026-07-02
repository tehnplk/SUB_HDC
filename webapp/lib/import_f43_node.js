const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");

const AdmZip = require("adm-zip");
const iconv = require("iconv-lite");
const mysql = require("mysql2/promise");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;
const SYSTEM_METADATA_COLUMNS = new Set(["file_name", "import_date_time", "log_import_id"]);

// ── Encryption rules ──
const ENCRYPT_RULES = {
  md5: {
    ACCIDENT: ["cid"],
    ADDRESS: ["cid"],
    ADMISSION: ["cid"],
    ANC: ["cid"],
    APPOINTMENT: ["cid"],
    CARD: ["cid"],
    CHARGE_IPD: ["cid"],
    CHARGE_OPD: ["cid"],
    CHRONIC: ["cid"],
    CHRONICFU: ["cid"],
    COMMUNITY_SERVICE: ["cid"],
    DEATH: ["cid"],
    DENTAL: ["cid"],
    DIAGNOSIS_IPD: ["cid"],
    DIAGNOSIS_OPD: ["cid"],
    DISABILITY: ["cid"],
    DRUGALLERGY: ["cid"],
    DRUG_IPD: ["cid"],
    DRUG_OPD: ["cid"],
    EPI: ["cid"],
    FP: ["cid"],
    FUNCTIONAL: ["cid"],
    ICF: ["cid"],
    LABFU: ["cid"],
    LABOR: ["cid"],
    NCDSCREEN: ["cid"],
    NEWBORN: ["cid"],
    NEWBORNCARE: ["cid"],
    NUTRITION: ["cid"],
    PERSON: ["cid", "father", "mother", "couple", "passport"],
    POSTNATAL: ["cid"],
    PRENATAL: ["cid"],
    PROCEDURE_IPD: ["cid"],
    PROCEDURE_OPD: ["cid"],
    PROVIDER: ["cid"],
    REHABILITATION: ["cid"],
    SERVICE: ["cid"],
    SPECIALPP: ["cid"],
    SURVEILLANCE: ["cid"],
    WOMEN: ["cid"],
  },
  aes: {
    PERSON: ["lname", "telephone", "mobile"],
    ADDRESS: ["house_id", "houseno"],
    HOME: ["house_id", "house", "telephone"],
    PROVIDER: ["lname"],
    SERVICE: ["insid"],
    CARD: ["insid"],
  },
};

function getAesKey(env) {
  const raw = env.ENCRYPT_KEY || "change_me";
  return crypto.createHash("sha256").update(raw).digest();
}

function md5(value) {
  if (!value) return value;
  return crypto.createHash("md5").update(String(value)).digest("hex");
}

function encryptAes(value, key) {
  if (!value) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("hex");
}

function encryptFileRows(file, aesKey) {
  const tableRulesKey = file.tableName.toUpperCase();
  const md5Columns = new Set((ENCRYPT_RULES.md5[tableRulesKey] || []).map((column) => column.toLowerCase()));
  const aesColumns = new Set((ENCRYPT_RULES.aes[tableRulesKey] || []).map((column) => column.toLowerCase()));
  const cidIndex = file.columns.findIndex((column) => column.toLowerCase() === "cid");
  const shouldAddCidAes =
    md5Columns.has("cid") &&
    cidIndex >= 0 &&
    !file.columns.some((column) => column.toLowerCase() === "cid_aes");

  if (!md5Columns.size && !aesColumns.size && !shouldAddCidAes) {
    return file;
  }

  const encryptedRows = file.rows.map((row) =>
    row.map((value, index) => {
      const column = file.columns[index]?.toLowerCase();
      if (md5Columns.has(column)) return md5(value);
      if (aesColumns.has(column)) return encryptAes(value, aesKey);
      return value;
    }).concat(shouldAddCidAes ? [encryptAes(row[cidIndex], aesKey)] : [])
  );

  return {
    ...file,
    columns: shouldAddCidAes ? file.columns.concat("cid_aes") : file.columns,
    rows: encryptedRows,
  };
}

function quoteIdentifier(name) {
  if (!name || !IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid MySQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

function decodeText(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return iconv.decode(buffer, "cp874").replace(/^\uFEFF/, "");
  }
}

function readF43Files(zipPath, sourceFileName) {
  const zip = new AdmZip(zipPath);
  const zipFileName = sourceFileName || path.basename(zipPath);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))
    .map((entry) => {
      const text = decodeText(entry.getData());
      const lines = text.split(/\r?\n/);
      while (lines.length && lines[lines.length - 1] === "") lines.pop();
      if (!lines.length) throw new Error(`Missing header in ${entry.entryName}`);

      const columns = lines[0].split("|").map((column) => column.trim().toLowerCase());
      if (columns.some((column) => !column)) {
        throw new Error(`Blank column name in ${entry.entryName}`);
      }

      const rows = [];
      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line) continue;
        const row = line.split("|");
        if (row.length !== columns.length) {
          throw new Error(
            `Column count mismatch in ${entry.entryName} line ${index + 1}: ` +
              `expected ${columns.length}, got ${row.length}`
          );
        }
        rows.push(row);
      }

      return {
        fileName: zipFileName,
        tableName: path.basename(entry.entryName, path.extname(entry.entryName)).toLowerCase(),
        columns,
        rows,
      };
    });
}

function emitJson(progressEnabled, event) {
  if (!progressEnabled) {
    return;
  }

  process.stdout.write(`${JSON.stringify(event)}\n`);
}

async function getExistingColumns(connection, tableName) {
  const [rows] = await connection.execute(`SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`);
  return new Map(rows.map((row) => [row.Field.toLowerCase(), row.Field]));
}

async function createLogImportFile(connection, fileName) {
  const [result] = await connection.execute(
    "INSERT INTO `log_import_file` (`file_name`, `status`) VALUES (?, ?)",
    [fileName, "pending"]
  );
  return result.insertId;
}

async function updateLogImportFileStatus(connection, id, status, notCompleteMsg = null) {
  if (!id) return;
  const shouldFinish = status === "complete" || status === "not_complate";
  await connection.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = ?,
         \`finish_date_time\` = ${shouldFinish ? "CURRENT_TIMESTAMP" : "NULL"},
         \`not_complete_msg\` = ?
     WHERE \`id\` = ?`,
    [status, notCompleteMsg, id]
  );
}

function tableImportLockName(database, tableName) {
  const key = `${database || "sub_hdc"}:${tableName}`.toLowerCase();
  const digest = crypto.createHash("sha1").update(key).digest("hex");
  return `sub_hdc_import_${digest}`;
}

async function acquireTableImportLock(connection, database, tableName, timeoutSeconds) {
  const lockName = tableImportLockName(database, tableName);
  const [rows] = await connection.execute("SELECT GET_LOCK(?, ?) AS acquired", [
    lockName,
    timeoutSeconds,
  ]);
  const acquired = Number(rows?.[0]?.acquired);
  if (acquired !== 1) {
    throw new Error(`${tableName}: timed out waiting for import lock`);
  }
  return lockName;
}

async function releaseTableImportLock(connection, lockName) {
  const [rows] = await connection.execute("SELECT RELEASE_LOCK(?) AS released", [lockName]);
  const released = Number(rows?.[0]?.released);
  if (released !== 1) {
    throw new Error(`${lockName}: import lock was not released`);
  }
}

async function withTableImportLock(connection, database, tableName, timeoutSeconds, callback) {
  if (!timeoutSeconds) {
    return callback();
  }

  const lockName = await acquireTableImportLock(connection, database, tableName, timeoutSeconds);
  let callbackError;
  try {
    return await callback();
  } catch (error) {
    callbackError = error;
    throw error;
  } finally {
    try {
      await releaseTableImportLock(connection, lockName);
    } catch (releaseError) {
      if (!callbackError) {
        throw releaseError;
      }
      console.error(releaseError.message);
    }
  }
}

function buildInsert(tableName, columns, rowCount) {
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const oneRow = `(${columns.map(() => "?").join(", ")})`;
  const valuesSql = Array.from({ length: rowCount }, () => oneRow).join(", ");
  return `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES ${valuesSql}`;
}

function getMysqlErrorText(error) {
  return String(error?.sqlMessage || error?.message || error || "");
}

function getMysqlErrorColumn(error) {
  const message = getMysqlErrorText(error);
  const match = message.match(/column '([^']+)'/i) || message.match(/column `([^`]+)`/i);
  return match?.[1] || null;
}

function getMysqlErrorBatchRow(error) {
  const message = getMysqlErrorText(error);
  const match = message.match(/\bat row (\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function addImportErrorContext(error, file, batchStart) {
  const column = getMysqlErrorColumn(error);
  const batchRow = getMysqlErrorBatchRow(error);
  const sourceRow = Number.isInteger(batchRow) ? batchStart + batchRow : null;
  const details = [
    `file=${file.fileName}`,
    `table=${file.tableName}`,
    column ? `column=${column}` : null,
    sourceRow ? `row=${sourceRow}` : null,
    batchRow && batchRow !== sourceRow ? `batchRow=${batchRow}` : null,
  ].filter(Boolean);
  const wrapped = new Error(`${getMysqlErrorText(error)} [${details.join(", ")}]`, { cause: error });
  wrapped.code = error?.code;
  wrapped.errno = error?.errno;
  wrapped.sqlState = error?.sqlState;
  return wrapped;
}

async function importFile(connection, file, batchSize, onDuplicate, onBatchComplete, logImportId) {
  const existingColumns = await getExistingColumns(connection, file.tableName);
  const importColumns = file.columns
    .filter((column) => !SYSTEM_METADATA_COLUMNS.has(column.toLowerCase()))
    .filter((column) => existingColumns.has(column.toLowerCase()))
    .map((column) => existingColumns.get(column.toLowerCase()));
  const missingColumns = file.columns.filter((column) => {
    const normalized = column.toLowerCase();
    return !SYSTEM_METADATA_COLUMNS.has(normalized) && !existingColumns.has(normalized);
  });

  if (existingColumns.has("log_import_id")) {
    if (logImportId === undefined || logImportId === null) {
      throw new Error(`${file.tableName}: log_import_id is required`);
    }
    importColumns.push(existingColumns.get("log_import_id"));
  }

  if (!importColumns.length) {
    throw new Error(`${file.tableName}: no importable columns found`);
  }

  let imported = 0;
  for (let start = 0; start < file.rows.length; start += batchSize) {
    const batch = file.rows.slice(start, start + batchSize);
    const values = [];
    for (const row of batch) {
      const rowByColumn = new Map(file.columns.map((column, index) => [column, row[index]]));
      for (const column of importColumns) {
        values.push(column.toLowerCase() === "log_import_id" ? logImportId : rowByColumn.get(column.toLowerCase()));
      }
    }

    let sql = buildInsert(file.tableName, importColumns, batch.length);
    if (onDuplicate === "ignore") {
      sql = sql.replace(/^INSERT INTO/i, "INSERT IGNORE INTO");
    } else if (onDuplicate === "replace") {
      sql = sql.replace(/^INSERT INTO/i, "REPLACE INTO");
    }
    try {
      await connection.execute(sql, values);
    } catch (error) {
      throw addImportErrorContext(error, file, start);
    }
    imported += batch.length;
    if (onBatchComplete) {
      onBatchComplete(batch.length, imported, file.rows.length);
    }
  }

  return {
    table: file.tableName,
    fileName: file.fileName,
    columns: importColumns.length,
    missingColumns,
    rows: imported,
  };
}

function parseArgs(argv = process.argv, env = process.env) {
  const args = {
    zip: "",
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_DATABASE || "sub_hdc",
    batchSize: 500,
    onDuplicate: "error",
    fileName: "",
    progress: false,
    concurrency: 20,
    advisoryLockTimeout: Number(env.IMPORT_ADVISORY_LOCK_TIMEOUT || 300),
    logImportId: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--zip") args.zip = next;
    else if (arg === "--host") args.host = next;
    else if (arg === "--port") args.port = Number(next);
    else if (arg === "--user") args.user = next;
    else if (arg === "--password") args.password = next;
    else if (arg === "--database") args.database = next;
    else if (arg === "--batch-size") args.batchSize = Number(next);
    else if (arg === "--on-duplicate") args.onDuplicate = next;
    else if (arg === "--file-name") args.fileName = next;
    else if (arg === "--concurrency") args.concurrency = Number(next);
    else if (arg === "--advisory-lock-timeout") args.advisoryLockTimeout = Number(next);
    else if (arg === "--log-import-id") args.logImportId = Number(next);
    else if (arg === "--progress") args.progress = true;
    else throw new Error(`Unknown argument: ${arg}`);
    if (!["--progress"].includes(arg)) index += 1;
  }

  if (!["error", "ignore", "replace"].includes(args.onDuplicate)) {
    throw new Error("--on-duplicate must be error, ignore, or replace");
  }
  if (!args.zip) {
    throw new Error("--zip is required");
  }
  if (!Number.isInteger(args.port) || args.port <= 0) {
    throw new Error("--port must be a positive integer");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize <= 0) {
    throw new Error("--batch-size must be a positive integer");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) {
    throw new Error("--concurrency must be a positive integer");
  }
  if (!Number.isInteger(args.advisoryLockTimeout) || args.advisoryLockTimeout < 0) {
    throw new Error("--advisory-lock-timeout must be zero or a positive integer");
  }
  if (args.logImportId !== null && (!Number.isInteger(args.logImportId) || args.logImportId <= 0)) {
    throw new Error("--log-import-id must be a positive integer");
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const files = readF43Files(args.zip, args.fileName || undefined);

  // Apply encryption according to encrypt_method.md
  const aesKey = getAesKey(process.env);
  for (let i = 0; i < files.length; i++) {
    files[i] = encryptFileRows(files[i], aesKey);
  }

  if (!files.length) {
    throw new Error("No .txt files found in the zip");
  }

  const totalRows = files.reduce((sum, file) => sum + file.rows.length, 0);
  let processedRows = 0;

  const pool = mysql.createPool({
    host: args.host,
    port: args.port,
    user: args.user,
    password: args.password,
    database: args.database,
    charset: "utf8mb4",
    connectionLimit: Math.max(args.concurrency, 1),
    waitForConnections: true,
    queueLimit: 0,
  });

  const semaphore = [];
  const limit = Math.max(args.concurrency, 1);

  function acquire() {
    return new Promise((resolve) => {
      semaphore.push(resolve);
      if (semaphore.length <= limit) resolve();
    });
  }

  function release() {
    semaphore.shift();
    if (semaphore.length >= limit) semaphore[limit - 1]?.();
  }

  const summary = [];
  let logImportId = args.logImportId;
  try {
    emitJson(args.progress, {
      type: "init",
      totalRows,
      totalFiles: files.length,
      fileName: args.fileName || path.basename(args.zip),
    });

    const logConn = await pool.getConnection();
    try {
      if (!logImportId) {
        logImportId = await createLogImportFile(logConn, args.fileName || path.basename(args.zip));
      }
      await updateLogImportFileStatus(logConn, logImportId, "processing");
    } finally {
      logConn.release();
    }

    const tasks = files.map((file) => async () => {
      const conn = await pool.getConnection();
      let transactionStarted = false;
      try {
        await withTableImportLock(conn, args.database, file.tableName, args.advisoryLockTimeout, async () => {
          await conn.beginTransaction();
          transactionStarted = true;
          try {
            const item = await importFile(
              conn,
              file,
              args.batchSize,
              args.onDuplicate,
              (batchRows, fileImported, fileTotal) => {
                processedRows += batchRows;
                const percent = totalRows ? Math.round((processedRows / totalRows) * 100) : 100;
                emitJson(args.progress, {
                  type: "progress",
                  table: file.tableName,
                  fileRows: fileImported,
                  fileTotal,
                  processedRows,
                  totalRows,
                  percent,
                });
              },
              logImportId
            );
            await conn.commit();
            transactionStarted = false;
            summary.push(item);
            emitJson(args.progress, {
              type: "table",
              table: item.table,
              rows: item.rows,
              missingColumns: item.missingColumns,
            });
            if (!args.progress) {
              const missing = item.missingColumns.length ? ` missing=${item.missingColumns.join(",")}` : "";
              console.log(`${item.table}: ${item.rows} rows${missing}`);
            }
          } catch (error) {
            if (transactionStarted) {
              await conn.rollback();
              transactionStarted = false;
            }
            throw error;
          }
        });
      } catch (error) {
        if (transactionStarted) {
          await conn.rollback();
        }
        throw error;
      } finally {
        conn.release();
      }
    });

    let running = 0;
    let nextIndex = 0;
    await new Promise((resolve, reject) => {
      function runNext() {
        while (running < limit && nextIndex < tasks.length) {
          const index = nextIndex++;
          running++;
          tasks[index]()
            .then(() => {
              running--;
              if (nextIndex === tasks.length && running === 0) {
                resolve();
              } else {
                runNext();
              }
            })
            .catch(reject);
        }
      }
      runNext();
    });

    emitJson(args.progress, {
      type: "done",
      totalRows,
      processedRows,
      tables: summary.length,
    });
    const completeConn = await pool.getConnection();
    try {
      await updateLogImportFileStatus(completeConn, logImportId, "complete");
    } finally {
      completeConn.release();
    }
  } catch (error) {
    if (logImportId) {
      const errorConn = await pool.getConnection();
      try {
        await updateLogImportFileStatus(errorConn, logImportId, "not_complate", error.message);
      } finally {
        errorConn.release();
      }
    }
    emitJson(args.progress, { type: "error", message: error.message });
    throw error;
  } finally {
    await pool.end();
  }

  if (!args.progress) {
    console.log("\nSummary");
    console.log("table|file_name|columns|rows|missing_columns");
    for (const item of summary.sort((a, b) => a.table.localeCompare(b.table))) {
      console.log(
        `${item.table}|${item.fileName}|${item.columns}|${item.rows}|${item.missingColumns.join(",")}`
      );
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildInsert,
  acquireTableImportLock,
  createLogImportFile,
  decodeText,
  encryptFileRows,
  releaseTableImportLock,
  getAesKey,
  getExistingColumns,
  importFile,
  main,
  md5,
  parseArgs,
  quoteIdentifier,
  readF43Files,
  tableImportLockName,
  updateLogImportFileStatus,
  withTableImportLock,
};
