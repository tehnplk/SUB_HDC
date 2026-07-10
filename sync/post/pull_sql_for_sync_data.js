const mysql = require("mysql2/promise");
const { buildAuthHeaders, resolveGetUrl } = require("./sync_config");

const GET_URL = resolveGetUrl("sql-command");
const DB_CONNECT_RETRIES = Number(process.env.SYNC_DB_CONNECT_RETRIES || 12);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.SYNC_DB_CONNECT_RETRY_DELAY_MS || 10000);
const DEFAULT_INTERVAL_MINUTES = 90;

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "host.docker.internal",
    port: Number(process.env.DB_PORT || 3308),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= DB_CONNECT_RETRIES; attempt += 1) {
    try {
      return await mysql.createConnection(getDbConfig());
    } catch (error) {
      lastError = error;
      console.error(
        `db connect attempt ${attempt}/${DB_CONNECT_RETRIES} failed: ${error?.message || error}`
      );
      if (attempt < DB_CONNECT_RETRIES) await sleep(DB_CONNECT_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

async function fetchSqlPayload() {
  const response = await fetch(GET_URL, { headers: buildAuthHeaders() });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`fetch sync SQL failed ${response.status}: ${text}`);
  }

  const body = JSON.parse(text);
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error(`unexpected sync SQL response: ${text}`);
  }
  return body.data;
}

function nullableText(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function nullableInteger(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_INTERVAL_MINUTES;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`invalid interval_minute: ${value}`);
  return parsed;
}

function normalizeRow(row) {
  const id = String(row?.id || "").trim();
  const kpiName = String(row?.kpi_name || "").trim();
  const sqlCommand = String(row?.sql_command || "").trim();
  const dUpdate = String(row?.d_update || "").trim();

  if (!id || !kpiName || !sqlCommand || !dUpdate) {
    throw new Error("sync SQL row requires id, kpi_name, sql_command, and d_update");
  }

  return [
    id,
    kpiName,
    nullableText(row.topic),
    nullableText(row.kpi_group),
    nullableInteger(row.interval_minute),
    JSON.stringify(row.tables_use ?? []),
    sqlCommand,
    nullableText(row.note),
    dUpdate,
  ];
}

const UPSERT_SQL = `
  INSERT INTO sql_for_sync_data
    (id, kpi_name, topic, kpi_group, interval_minute, tables_use, sql_command, note, d_update)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    kpi_name = VALUES(kpi_name),
    topic = VALUES(topic),
    kpi_group = VALUES(kpi_group),
    interval_minute = VALUES(interval_minute),
    tables_use = VALUES(tables_use),
    sql_command = VALUES(sql_command),
    note = VALUES(note),
    d_update = VALUES(d_update),
    is_active = 1
`;

async function saveSqlPayload(connection, rows) {
  await connection.beginTransaction();
  try {
    for (const row of rows) {
      await connection.execute(UPSERT_SQL, normalizeRow(row));
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const rows = await fetchSqlPayload();
  if (process.env.SYNC_DRY_RUN === "true") {
    console.log(JSON.stringify({ success: true, row_count: rows.length, ids: rows.map((row) => row.id) }));
    return;
  }

  const connection = await connectWithRetry();
  try {
    await saveSqlPayload(connection, rows);
    console.log(JSON.stringify({ success: true, row_count: rows.length }));
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { DEFAULT_INTERVAL_MINUTES, UPSERT_SQL, normalizeRow, saveSqlPayload };
