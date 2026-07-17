import { getPooledDbConnection } from "./db.js";

export const HDC_API_TOOL_NAME = "hdc-api-tool";
export const HDC_API_BASE_URL = "https://opendata.moph.go.th/api";
export const HDC_API_DEFAULT_PROVINCE = "65";
export const HDC_API_TIMEOUT_MS = 20000;
export const MAX_HDC_API_ROWS = 100;
export const MAX_HDC_REPORT_MATCHES = 10;

export const HDC_API_TOOL = {
  type: "function",
  function: {
    name: HDC_API_TOOL_NAME,
    description:
      "Fetch summary report data from the central HDC (กระทรวงสาธารณสุข opendata) API for province 65. Use when the user asks for data from HDC กลาง / HDC จังหวัด / opendata reports. First call with `search` to resolve the report and its source_table from the local hdc_api_report catalog, then call again with `source_table` and `year` to fetch rows, or with `action`='schema' to inspect the report's column definitions first.",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description:
            "Thai keyword(s) from the report name to look up in the hdc_api_report catalog, e.g. 'พัฒนาการเด็ก'. Returns matching report names with their source_table.",
        },
        source_table: {
          type: "string",
          description: "Exact source_table of the report to fetch data for, e.g. 's_childdev_specialpp'.",
        },
        year: {
          type: "string",
          description: "Thai Buddhist fiscal year, e.g. '2569'. Required when fetching data with source_table.",
        },
        action: {
          type: "string",
          enum: ["data", "schema"],
          description:
            "'data' (default) fetches report rows; 'schema' fetches the report's column definitions from GET /report_schema/{source_table} (no year needed).",
        },
      },
      additionalProperties: false,
    },
  },
};

async function resolveReports(search, connectionFactory) {
  const conn = await connectionFactory();
  try {
    // Tokenize so multi-word searches ("เบาหวาน HbA1c") match reports that
    // contain every word anywhere in the name, not the exact phrase.
    const tokens = String(search).trim().split(/\s+/).filter(Boolean).slice(0, 6);
    const conditions = tokens.map(() => "(report_name LIKE ? OR source_table LIKE ?)").join(" AND ");
    const values = tokens.flatMap((token) => [`%${token}%`, `%${token}%`]);
    const [rows] = await conn.query({
      sql: `SELECT report_name, source_table, category_name FROM hdc_api_report WHERE source_table IS NOT NULL AND ${conditions} LIMIT ?`,
      values: [...values, MAX_HDC_REPORT_MATCHES + 1],
      timeout: 8000,
    });
    if (rows.length || tokens.length <= 1) return rows;

    // Fall back to OR matching so a partially wrong keyword still finds
    // candidates instead of burning a round on an empty result.
    const orConditions = tokens.map(() => "(report_name LIKE ? OR source_table LIKE ?)").join(" OR ");
    const [fallbackRows] = await conn.query({
      sql: `SELECT report_name, source_table, category_name FROM hdc_api_report WHERE source_table IS NOT NULL AND (${orConditions}) LIMIT ?`,
      values: [...values, MAX_HDC_REPORT_MATCHES + 1],
      timeout: 8000,
    });
    return fallbackRows;
  } finally {
    await conn.end();
  }
}

async function fetchReportSchema(sourceTable) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HDC_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${HDC_API_BASE_URL}/report_schema/${encodeURIComponent(sourceTable)}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HDC API responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchReportData(sourceTable, year, province) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HDC_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${HDC_API_BASE_URL}/report_data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableName: sourceTable,
        year: String(year),
        province: String(province),
        type: "json",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HDC API responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function runHdcApiTool(args, deps = {}) {
  const {
    connectionFactory = getPooledDbConnection,
    fetchData = fetchReportData,
    fetchSchema = fetchReportSchema,
  } = deps;
  const search = String(args?.search || "").trim();
  const sourceTable = String(args?.source_table || "").trim();
  const action = String(args?.action || "data").trim().toLowerCase();

  if (!search && !sourceTable) {
    throw new Error("HdcApi requires either `search` or `source_table`");
  }

  if (!sourceTable) {
    const matches = await resolveReports(search, connectionFactory);
    const requestLabel = `${HDC_API_TOOL_NAME} search="${search}"`;
    if (!matches.length) {
      return {
        ok: true,
        mode: "search",
        sql: requestLabel,
        search,
        matches: [],
        rowCount: 0,
        note: "No report matched. Try a shorter Thai keyword.",
      };
    }
    return {
      ok: true,
      mode: "search",
      sql: requestLabel,
      search,
      truncated: matches.length > MAX_HDC_REPORT_MATCHES,
      matches: matches.slice(0, MAX_HDC_REPORT_MATCHES),
      rowCount: Math.min(matches.length, MAX_HDC_REPORT_MATCHES),
      note: `Pick the best matching report from \`matches\` NOW and call ${HDC_API_TOOL_NAME} again with its exact source_table plus year to fetch data. Do not run another search unless matches is empty.`,
    };
  }

  if (!/^[a-z0-9_]+$/i.test(sourceTable)) {
    throw new Error("HdcApi source_table must be a plain table name");
  }

  if (action === "schema") {
    const schema = await fetchSchema(sourceTable);
    return {
      ok: true,
      mode: "schema",
      sql: `GET ${HDC_API_BASE_URL}/report_schema/${sourceTable}`,
      source_table: sourceTable,
      schema,
      rowCount: Array.isArray(schema) ? schema.length : 0,
    };
  }

  const year = String(args?.year || "").trim();
  if (!/^25\d{2}$/.test(year)) {
    throw new Error("HdcApi requires `year` as a Thai Buddhist year, e.g. 2569");
  }

  // Fetch the report schema alongside the data (best effort) so the model
  // always understands each column's meaning before answering — the Thai
  // COLUMN_COMMENT is what defines target/result semantics per report.
  const [payload, schema] = await Promise.all([
    fetchData(sourceTable, year, HDC_API_DEFAULT_PROVINCE),
    Promise.resolve()
      .then(() => fetchSchema(sourceTable))
      .catch(() => null),
  ]);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const safeRows = rows.slice(0, MAX_HDC_API_ROWS);
  const columns = safeRows.length ? Object.keys(safeRows[0]) : [];

  // Province-level sums over ALL rows (not just the truncated sample) so the
  // model can answer overview questions correctly even when rows are limited.
  const columnTotals = {};
  for (const column of columns) {
    let sum = 0;
    let numeric = 0;
    for (const row of rows) {
      const value = Number(String(row?.[column] ?? "").replace(/,/g, ""));
      if (Number.isFinite(value) && String(row?.[column]).trim() !== "") {
        sum += value;
        numeric += 1;
      }
    }
    if (numeric > 0 && numeric >= rows.length / 2) columnTotals[column] = sum;
  }

  return {
    ok: true,
    mode: "data",
    sql: `POST ${HDC_API_BASE_URL}/report_data {tableName: ${sourceTable}, year: ${year}, province: ${HDC_API_DEFAULT_PROVINCE}}`,
    source_table: sourceTable,
    year,
    province: HDC_API_DEFAULT_PROVINCE,
    columns,
    rows: safeRows,
    rowCount: safeRows.length,
    limited: rows.length > safeRows.length,
    totalRows: rows.length,
    columnTotals,
    column_definitions: Array.isArray(schema)
      ? schema.map((item) => ({
          name: item.COLUMN_NAME,
          type: item.COLUMN_TYPE,
          comment: item.COLUMN_COMMENT,
        }))
      : null,
    note: "Read column_definitions first to understand what each column means before interpreting the numbers. rows are per-area/hospital records from central HDC; columnTotals sums every row (use for province-level answers). This data is NOT in the local database — do not query local tables for it.",
  };
}

export function userMentionedHdc(messages) {
  const source = Array.isArray(messages) ? messages : [{ content: messages }];
  const latestUserMessage = source.findLast?.((message) => message?.role === "user" && message?.content)
    || [...source].reverse().find((message) => message?.role === "user" && message?.content)
    || source[source.length - 1];
  const content = String(latestUserMessage?.content || "");

  return /hdc|เอชดีซี|โอเพนดาต้า|opendata/i.test(content);
}
