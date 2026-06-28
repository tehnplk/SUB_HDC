import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import { createDbConnection } from "./db.js";
import { normalizeDbQuerySql } from "./db-query-tool.mjs";

export const EXCEL_EXPORT_TOOL_NAME = "ExcelExport";
export const MAX_EXCEL_EXPORT_ROWS = 5000;
const EXCEL_EXPORT_REQUEST_PATTERN =
  /\b(excel|xlsx|spreadsheet|export|download)\b|ส่งออก|ดาวน์โหลด|เอ็กเซล|เอกเซล|ตารางไฟล์/i;
const EXCEL_EXPORT_NEGATION_PATTERN =
  /\b(no|without|dont|don't|do not|not)\s+(?:export|download|excel|xlsx|spreadsheet)\b|ไม่(?:ต้อง|เอา|ส่งออก|ดาวน์โหลด|ต้องการ).{0,16}(?:excel|xlsx|เอ็กเซล|เอกเซล|ไฟล์)/i;

export const EXCEL_EXPORT_TOOL = {
  type: "function",
  function: {
    name: EXCEL_EXPORT_TOOL_NAME,
    description:
      "Generate an Excel .xlsx file from one read-only SUB HDC SQL query and return a download link. Use only when the user asks to export, download, or generate Excel/XLSX/spreadsheet output.",
    parameters: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "A single read-only SQL statement for the rows to export. Prefer the same aggregate query used to answer the user.",
        },
        filename: {
          type: "string",
          description: "Optional human-friendly Excel filename without path. .xlsx is added automatically if omitted.",
        },
        sheetName: {
          type: "string",
          description: "Optional worksheet name. Keep it short.",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
};

function serializeValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("hex");
  return value;
}

function serializeRows(rows) {
  return rows.slice(0, MAX_EXCEL_EXPORT_ROWS).map((row) => {
    const serialized = {};
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = serializeValue(value);
    }
    return serialized;
  });
}

export function applyExcelExportLimit(sql) {
  if (!/^select\b/i.test(sql)) return sql;

  const limitMatch = sql.match(/\blimit\s+(\d+)\b/i);
  if (!limitMatch) return `${sql} LIMIT ${MAX_EXCEL_EXPORT_ROWS}`;

  const requestedLimit = Number(limitMatch[1]);
  if (!Number.isFinite(requestedLimit) || requestedLimit <= MAX_EXCEL_EXPORT_ROWS) return sql;

  return sql.replace(/\blimit\s+\d+\b/i, `LIMIT ${MAX_EXCEL_EXPORT_ROWS}`);
}

function sanitizeWorksheetName(name) {
  const sanitized = String(name || "Export")
    .replace(/[:\\/?*\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || "Export").slice(0, 31);
}

export function sanitizeExcelFilename(name, now = new Date()) {
  const fallback = `sub-hdc-export-${now.toISOString().slice(0, 10)}`;
  const base = String(name || fallback)
    .replace(/\.xlsx$/i, "")
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/[^\w.-]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 90);

  return `${base || fallback}.xlsx`;
}

function makeStoredFilename(displayName) {
  const extSafeName = sanitizeExcelFilename(displayName);
  const random = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return `${random}-${extSafeName}`;
}

function getExportRoot(root = process.cwd()) {
  return path.join(root, "tmp", "ai-exports");
}

function buildWorkbook(rows, columns, sheetName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: columns })
    : XLSX.utils.aoa_to_sheet([columns.length ? columns : ["No data"]]);

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeWorksheetName(sheetName));
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

export async function runExcelExportTool(args, connectionFactory = createDbConnection, options = {}) {
  const sql = normalizeDbQuerySql(args?.sql);
  const limitedSql = applyExcelExportLimit(sql);
  let conn;

  try {
    conn = await connectionFactory();
    const [rows, fields] = await conn.query({
      sql: limitedSql,
      timeout: options.timeoutMs || 15000,
    });

    const columns = Array.isArray(fields) ? fields.map((field) => field.name) : [];
    const safeRows = Array.isArray(rows) ? serializeRows(rows) : [];
    const displayName = sanitizeExcelFilename(args?.filename);
    const storedName = makeStoredFilename(displayName);
    const exportRoot = options.exportRoot || getExportRoot(options.cwd || process.cwd());
    const filePath = path.join(exportRoot, storedName);
    const sheetName = sanitizeWorksheetName(args?.sheetName || "Export");
    const buffer = buildWorkbook(safeRows, columns, sheetName);

    await mkdir(exportRoot, { recursive: true });
    await writeFile(filePath, buffer);

    return {
      ok: true,
      sql: limitedSql,
      columns,
      rowCount: safeRows.length,
      limited: Array.isArray(rows) && rows.length > safeRows.length,
      filename: displayName,
      storedName,
      sheetName,
      downloadUrl: `/api/ai/export/${encodeURIComponent(storedName)}`,
    };
  } finally {
    if (conn) await conn.end();
  }
}

export function userRequestedExcelExport(messages) {
  const source = Array.isArray(messages) ? messages : [{ content: messages }];
  const latestUserMessage = source.findLast?.((message) => message?.role === "user" && message?.content)
    || [...source].reverse().find((message) => message?.role === "user" && message?.content)
    || source[source.length - 1];
  const content = String(latestUserMessage?.content || "");

  return EXCEL_EXPORT_REQUEST_PATTERN.test(content) && !EXCEL_EXPORT_NEGATION_PATTERN.test(content);
}
