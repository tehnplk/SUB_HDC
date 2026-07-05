const fs = require("node:fs/promises");
const path = require("node:path");

const {
  getExistingColumns,
  getImportColumns,
  quoteIdentifier,
} = require("./import_f43_shared.js");

function escapeSqlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function encodeLoadDataValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\r?\n/g, " ").replace(/\|/g, " ");
}

function buildLoadDataSql(tableName, columns, filePath, onDuplicate) {
  const duplicateSql = onDuplicate === "replace" ? "REPLACE " : onDuplicate === "ignore" ? "IGNORE " : "";
  return [
    `LOAD DATA LOCAL INFILE '${escapeSqlString(filePath.replace(/\\/g, "/"))}'`,
    `${duplicateSql}INTO TABLE ${quoteIdentifier(tableName)}`,
    "CHARACTER SET utf8mb4",
    "FIELDS TERMINATED BY '|'",
    "LINES TERMINATED BY '\\n'",
    `(${columns.map(quoteIdentifier).join(", ")})`,
  ].join("\n");
}

function addLoadDataErrorContext(error, file) {
  const message = String(error?.sqlMessage || error?.message || error || "");
  const column = message.match(/column '([^']+)'/i)?.[1] || message.match(/column `([^`]+)`/i)?.[1];
  const details = [
    `file=${file.fileName}`,
    `table=${file.tableName}`,
    column ? `column=${column}` : null,
  ].filter(Boolean);
  const wrapped = new Error(`${message} [${details.join(", ")}]`, { cause: error });
  wrapped.code = error?.code;
  wrapped.errno = error?.errno;
  wrapped.sqlState = error?.sqlState;
  return wrapped;
}

async function writeLoadDataTempFile(tmpDir, file, importColumns, logImportId) {
  await fs.mkdir(tmpDir, { recursive: true });
  const tempPath = path.join(
    tmpDir,
    `${file.tableName}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tsv`
  );
  const lines = file.rows.map((row) => {
    const rowByColumn = new Map(file.columns.map((column, index) => [column, row[index]]));
    return importColumns
      .map((column) => column.toLowerCase() === "log_import_id" ? logImportId : rowByColumn.get(column.toLowerCase()))
      .map(encodeLoadDataValue)
      .join("|");
  });
  await fs.writeFile(tempPath, `${lines.join("\n")}${lines.length ? "\n" : ""}`, "utf8");
  return tempPath;
}

async function importFile(connection, file, batchSize, onDuplicate, onBatchComplete, logImportId, options = {}) {
  const existingColumns = await getExistingColumns(connection, file.tableName);
  const { importColumns, missingColumns } = getImportColumns(existingColumns, file, logImportId);
  const tmpDir = options.tmpDir || path.join(process.cwd(), "tmp", "load-data");
  const tempPath = await writeLoadDataTempFile(tmpDir, file, importColumns, logImportId);

  try {
    const sql = buildLoadDataSql(file.tableName, importColumns, tempPath, onDuplicate);
    const execute = typeof connection.query === "function" ? connection.query.bind(connection) : connection.execute.bind(connection);
    try {
      await execute(sql);
    } catch (error) {
      throw addLoadDataErrorContext(error, file);
    }
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }

  if (onBatchComplete) {
    onBatchComplete(file.rows.length, file.rows.length, file.rows.length);
  }

  return {
    table: file.tableName,
    fileName: file.fileName,
    columns: importColumns.length,
    missingColumns,
    rows: file.rows.length,
  };
}

module.exports = {
  addLoadDataErrorContext,
  buildLoadDataSql,
  importFile,
  writeLoadDataTempFile,
};
