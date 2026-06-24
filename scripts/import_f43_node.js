const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");

const AdmZip = require("adm-zip");
const iconv = require("iconv-lite");
const mysql = require("mysql2/promise");

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;

function loadEnv(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;

  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }
  return values;
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
  return new Set(rows.map((row) => row.Field));
}

function buildInsert(tableName, columns, rowCount) {
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const oneRow = `(${columns.map(() => "?").join(", ")})`;
  const valuesSql = Array.from({ length: rowCount }, () => oneRow).join(", ");
  return `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES ${valuesSql}`;
}

async function importFile(connection, file, batchSize, onDuplicate, onBatchComplete) {
  const existingColumns = await getExistingColumns(connection, file.tableName);
  const importColumns = file.columns.filter((column) => existingColumns.has(column));
  const missingColumns = file.columns.filter((column) => !existingColumns.has(column));

  if (existingColumns.has("file_name")) {
    importColumns.push("file_name");
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
        values.push(column === "file_name" ? file.fileName : rowByColumn.get(column));
      }
    }

    let sql = buildInsert(file.tableName, importColumns, batch.length);
    if (onDuplicate === "ignore") {
      sql = sql.replace(/^INSERT INTO/i, "INSERT IGNORE INTO");
    } else if (onDuplicate === "replace") {
      sql = sql.replace(/^INSERT INTO/i, "REPLACE INTO");
    }
    await connection.execute(sql, values);
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

function parseArgs() {
  const env = loadEnv(path.resolve(".env"));
  const args = {
    zip: "upload/F43_11251_20260501163101.zip",
    host: env.HOST || "localhost",
    port: Number(env.PORT || 3306),
    user: env.USER || "root",
    password: env.PASSWORD || "",
    database: env.DATABASE || "sub_hdc",
    batchSize: 500,
    onDuplicate: "error",
    fileName: "",
    progress: false,
    concurrency: 20,
  };

  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
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
    else if (arg === "--progress") args.progress = true;
    else throw new Error(`Unknown argument: ${arg}`);
    index += 1;
  }

  if (!["error", "ignore", "replace"].includes(args.onDuplicate)) {
    throw new Error("--on-duplicate must be error, ignore, or replace");
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const files = readF43Files(args.zip, args.fileName || undefined);

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
  try {
    emitJson(args.progress, {
      type: "init",
      totalRows,
      totalFiles: files.length,
      fileName: args.fileName || path.basename(args.zip),
    });

    const tasks = files.map((file) => async () => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
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
          }
        );
        await conn.commit();
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
        await conn.rollback();
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
  } catch (error) {
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

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
