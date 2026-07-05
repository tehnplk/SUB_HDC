const {
  getExistingColumns,
  getImportColumns,
  quoteIdentifier,
} = require("./import_f43_shared.js");

function buildInsert(tableName, columns, onDuplicate) {
  const verb = onDuplicate === "replace" ? "REPLACE" : onDuplicate === "ignore" ? "INSERT IGNORE" : "INSERT";
  const placeholders = columns.map(() => "?").join(", ");
  return `${verb} INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`;
}

function addInsertErrorContext(error, file, batchStart, batchRows) {
  const message = String(error?.sqlMessage || error?.message || error || "");
  const column = message.match(/column '([^']+)'/i)?.[1] || message.match(/column `([^`]+)`/i)?.[1];
  const details = [
    `file=${file.fileName}`,
    `table=${file.tableName}`,
    `batchStart=${batchStart + 1}`,
    `batchRows=${batchRows}`,
    column ? `column=${column}` : null,
  ].filter(Boolean);
  const wrapped = new Error(`${message} [${details.join(", ")}]`, { cause: error });
  wrapped.code = error?.code;
  wrapped.errno = error?.errno;
  wrapped.sqlState = error?.sqlState;
  return wrapped;
}

async function importFile(connection, file, batchSize, onDuplicate, onBatchComplete, logImportId) {
  const existingColumns = await getExistingColumns(connection, file.tableName);
  const { importColumns, missingColumns } = getImportColumns(existingColumns, file, logImportId);
  const sql = buildInsert(file.tableName, importColumns, onDuplicate);
  let imported = 0;

  for (let start = 0; start < file.rows.length; start += batchSize) {
    const batch = file.rows.slice(start, start + batchSize);
    for (const row of batch) {
      const rowByColumn = new Map(file.columns.map((column, index) => [column.toLowerCase(), row[index]]));
      const values = importColumns.map((column) =>
        column.toLowerCase() === "log_import_id" ? logImportId : rowByColumn.get(column.toLowerCase())
      );
      try {
        await connection.execute(sql, values);
      } catch (error) {
        throw addInsertErrorContext(error, file, start, batch.length);
      }
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
    rows: file.rows.length,
  };
}

module.exports = {
  addInsertErrorContext,
  buildInsert,
  importFile,
};
