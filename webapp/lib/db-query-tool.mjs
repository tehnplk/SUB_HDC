import { createDbConnection } from "./db.js";

export const DB_QUERY_TOOL_NAME = "DbQuery";
export const MAX_DB_QUERY_ROWS = 50;
export const DB_QUERY_TIMEOUT_MS = 8000;

const MUTATION_SQL_PATTERN =
  /\b(insert|update|delete|drop|truncate|alter|create|replace|merge|grant|revoke|lock|unlock|call|execute|set|use|start|commit|rollback)\b/i;
const RISKY_READ_SQL_PATTERN =
  /\b(into\s+outfile|into\s+dumpfile|load_file\s*\(|sleep\s*\(|benchmark\s*\(|get_lock\s*\(|release_lock\s*\(|for\s+update)\b/i;

export const DB_QUERY_TOOL = {
  type: "function",
  function: {
    name: DB_QUERY_TOOL_NAME,
    description:
      "Run one read-only SQL query against the SUB HDC MariaDB database. Use this for schema inspection and data questions. Only SELECT, SHOW, DESCRIBE, DESC, and EXPLAIN are allowed. Results are limited.",
    parameters: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "A single read-only SQL statement. Prefer short aggregate queries. Use c_file to discover imported F43 table names.",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
};

export function normalizeDbQuerySql(sql) {
  const normalized = String(sql || "").trim().replace(/;+\s*$/, "");
  if (!normalized) {
    throw new Error("DbQuery SQL is required");
  }
  if (/;/.test(normalized)) {
    throw new Error("DbQuery accepts only one SQL statement");
  }
  if (!/^(select|show|describe|desc|explain)\b/i.test(normalized)) {
    throw new Error("DbQuery only allows read-only SELECT, SHOW, DESCRIBE, DESC, or EXPLAIN statements");
  }
  if (MUTATION_SQL_PATTERN.test(normalized) || RISKY_READ_SQL_PATTERN.test(normalized)) {
    throw new Error("DbQuery rejected unsafe SQL");
  }
  return normalized;
}

export function applyDbQueryLimit(sql) {
  if (!/^select\b/i.test(sql)) return sql;
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql} LIMIT ${MAX_DB_QUERY_ROWS}`;
}

function serializeValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("hex");
  return value;
}

export function serializeRows(rows) {
  return rows.slice(0, MAX_DB_QUERY_ROWS).map((row) => {
    const serialized = {};
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = serializeValue(value);
    }
    return serialized;
  });
}

export async function runDbQueryTool(args, connectionFactory = createDbConnection) {
  const sql = normalizeDbQuerySql(args?.sql);
  const limitedSql = applyDbQueryLimit(sql);
  let conn;

  try {
    conn = await connectionFactory();
    const [rows, fields] = await conn.query({
      sql: limitedSql,
      timeout: DB_QUERY_TIMEOUT_MS,
    });
    const safeRows = Array.isArray(rows) ? serializeRows(rows) : [];

    return {
      ok: true,
      sql: limitedSql,
      columns: Array.isArray(fields) ? fields.map((field) => field.name) : [],
      rows: safeRows,
      rowCount: safeRows.length,
      limited: Array.isArray(rows) && rows.length > safeRows.length,
    };
  } finally {
    if (conn) await conn.end();
  }
}
