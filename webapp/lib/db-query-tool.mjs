import { getPooledDbConnection } from "./db.js";

export const DB_QUERY_TOOL_NAME = "DbQuery";
export const MAX_DB_QUERY_ROWS = 50;
export const DB_QUERY_TIMEOUT_MS = 8000;
// Long text cells (e.g. c_files_schema.description) are truncated before the
// rows are sent back to the model — the full value rarely changes the answer
// but costs tokens on every remaining round.
export const MAX_DB_QUERY_CELL_CHARS = 300;

const MUTATION_SQL_PATTERN =
  /\b(insert|update|delete|drop|truncate|alter|create|replace|rename|merge|grant|revoke|lock|unlock|call|execute|do|handler|load|install|uninstall|shutdown|kill|reset|purge|flush|optimize|repair|analyze|set|use|start|begin|commit|rollback|savepoint|prepare|deallocate)\b/i;
const RISKY_READ_SQL_PATTERN =
  /\b(into\s+outfile|into\s+dumpfile|load_file\s*\(|sleep\s*\(|benchmark\s*\(|get_lock\s*\(|release_lock\s*\(|master_pos_wait\s*\(|for\s+update|lock\s+in\s+share\s+mode)\b/i;
// Block every comment form so keywords cannot hide in MariaDB executable
// comments (/*! ... */) or trailing comment tricks.
const SQL_COMMENT_PATTERN = /(--|#|\/\*)/;

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
  if (SQL_COMMENT_PATTERN.test(normalized)) {
    throw new Error("DbQuery does not allow SQL comments");
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
  if (typeof value === "string" && value.length > MAX_DB_QUERY_CELL_CHARS) {
    return `${value.slice(0, MAX_DB_QUERY_CELL_CHARS)}…`;
  }
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

// Repeated questions in one conversation (table answer, then chart, then
// export) usually re-run the same SQL — serve identical statements from a
// short-lived cache instead of hitting the database again.
export const DB_QUERY_CACHE_TTL_MS = 120000;
const DB_QUERY_CACHE_MAX_ENTRIES = 100;
const queryCache = new Map();

export function clearDbQueryCache() {
  queryCache.clear();
}

function getCachedQueryResult(sql) {
  const entry = queryCache.get(sql);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    queryCache.delete(sql);
    return null;
  }
  return entry.result;
}

function setCachedQueryResult(sql, result) {
  if (queryCache.size >= DB_QUERY_CACHE_MAX_ENTRIES) {
    queryCache.delete(queryCache.keys().next().value);
  }
  queryCache.set(sql, { result, expires: Date.now() + DB_QUERY_CACHE_TTL_MS });
}

export async function runDbQueryTool(args, connectionFactory = getPooledDbConnection) {
  const sql = normalizeDbQuerySql(args?.sql);
  const limitedSql = applyDbQueryLimit(sql);

  const cached = getCachedQueryResult(limitedSql);
  if (cached) return cached;

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
