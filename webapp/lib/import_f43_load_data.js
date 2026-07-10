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
    // ESCAPED BY '' — ปิดการตีความ backslash เพราะข้อมูล free text (เช่น CHIEFCOMP)
    // อาจลงท้ายด้วย \ ทำให้ \| ถูกอ่านเป็นตัวอักษร | แล้วคอลัมน์ขาด
    "FIELDS TERMINATED BY '|' ESCAPED BY ''",
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

// LOAD DATA สตรีมไฟล์ผ่าน socket — ถ้า network สะดุดกลางคัน (half-open TCP)
// ทั้ง client และ server จะรอกันชั่วนิรันดร์ (client ค้าง ep_poll, server ค้าง
// "Reading from net"). ตั้ง net_read/write_timeout ต่อ session เป็นเพดานที่รู้ค่า
// แน่นอนไม่ว่า server config เป็นอะไร — กัน config drift ไม่ใช่ตัวตัดหลัก
// (ตัวตัดหลักคือ watchdog ใน import_daemon.js).
// ค่า default ต้องเท่า my.cnf (3600) — ห้ามต่ำกว่า: เคยตั้ง 600 แล้วตัด
// connection กลาง import chronicfu (365k แถว ใช้ ~619 วิ บนเครื่อง disk-bound)
const LOAD_DATA_NET_TIMEOUT_SECONDS = Number(process.env.IMPORT_LOAD_NET_TIMEOUT || 3600);

async function importFile(connection, file, batchSize, onDuplicate, onBatchComplete, logImportId, options = {}) {
  const existingColumns = await getExistingColumns(connection, file.tableName);
  const { importColumns, missingColumns } = getImportColumns(existingColumns, file, logImportId);
  const tmpDir = options.tmpDir || path.join(process.cwd(), "tmp", "load-data");
  const tempPath = await writeLoadDataTempFile(tmpDir, file, importColumns, logImportId);

  try {
    const sql = buildLoadDataSql(file.tableName, importColumns, tempPath, onDuplicate);
    const execute = typeof connection.query === "function" ? connection.query.bind(connection) : connection.execute.bind(connection);
    try {
      const netTimeout = Number(options.netTimeoutSeconds ?? LOAD_DATA_NET_TIMEOUT_SECONDS);
      if (Number.isInteger(netTimeout) && netTimeout > 0) {
        // ตั้งเฉพาะ session นี้ — ไม่กระทบ connection อื่นใน pool/ทั้ง server
        await execute(`SET SESSION net_read_timeout = ${netTimeout}, net_write_timeout = ${netTimeout}`);
      }
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
