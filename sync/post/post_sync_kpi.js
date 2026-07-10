const mysql = require("mysql2/promise");
const { resolvePostUrl } = require("./sync_config");

const DB_CONNECT_RETRIES = Number(process.env.SYNC_DB_CONNECT_RETRIES || 12);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.SYNC_DB_CONNECT_RETRY_DELAY_MS || 10000);
const RUN_LOCK_NAME = "sub_hdc_sync_kpi_runner";

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

function isDue(intervalMinute, now = Date.now()) {
  const interval = Number(intervalMinute);
  if (!Number.isInteger(interval) || interval <= 0) return false;
  return Math.floor(Number(now) / 60000) % interval === 0;
}

async function loadScheduledKpis(connection) {
  const [rows] = await connection.execute(`
    SELECT id, kpi_name, topic, kpi_group, interval_minute, tables_use, sql_command, note
    FROM sql_for_sync_data
    WHERE is_active = 1
      AND interval_minute IS NOT NULL
      AND interval_minute > 0
    ORDER BY id
  `);
  return rows;
}

async function runKpiQuery(connection, kpi) {
  const [rows] = await connection.query(kpi.sql_command);
  return Array.isArray(rows) ? rows : [];
}

function buildPayload(kpi, rows) {
  return {
    sub_center_name: process.env.CENTER_NAME || "",
    topic: kpi.topic || kpi.kpi_name,
    kpi_id: kpi.id,
    kpi_name: kpi.kpi_name,
    rows,
  };
}

async function postKpiResult(kpi, rows, fetchImpl = fetch) {
  const targetUrl = resolvePostUrl(kpi.topic || "");
  const response = await fetchImpl(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(buildPayload(kpi, rows)),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SSJ sync KPI failed ${response.status}: ${text}`);
  }
  return text;
}

async function acquireRunLock(connection) {
  const [rows] = await connection.execute("SELECT GET_LOCK(?, 0) AS acquired", [RUN_LOCK_NAME]);
  return Number(rows[0]?.acquired) === 1;
}

async function releaseRunLock(connection) {
  await connection.execute("SELECT RELEASE_LOCK(?)", [RUN_LOCK_NAME]);
}

async function main() {
  const connection = await connectWithRetry();
  let locked = false;

  try {
    locked = await acquireRunLock(connection);
    if (!locked) {
      console.log(JSON.stringify({ success: true, skipped: "runner_already_active" }));
      return;
    }

    const scheduledKpis = await loadScheduledKpis(connection);
    const now = Date.now();
    const dueKpis = scheduledKpis.filter((kpi) => isDue(kpi.interval_minute, now));

    if (process.env.SYNC_DRY_RUN === "true") {
      console.log(JSON.stringify({
        success: true,
        scheduled_count: scheduledKpis.length,
        due_count: dueKpis.length,
        due_ids: dueKpis.map((kpi) => kpi.id),
      }));
      return;
    }

    const results = [];
    for (const kpi of dueKpis) {
      try {
        const rows = await runKpiQuery(connection, kpi);
        const responseText = await postKpiResult(kpi, rows);
        results.push({
          kpi_id: kpi.id,
          topic: kpi.topic || kpi.kpi_name,
          interval_minute: Number(kpi.interval_minute),
          row_count: rows.length,
          response: responseText,
        });
      } catch (error) {
        console.error(`KPI ${kpi.id} (${kpi.kpi_name}) failed: ${error?.message || error}`);
        results.push({ kpi_id: kpi.id, error: error?.message || String(error) });
      }
    }

    console.log(JSON.stringify({
      success: true,
      scheduled_count: scheduledKpis.length,
      due_count: dueKpis.length,
      results,
    }));
  } finally {
    if (locked) await releaseRunLock(connection);
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildPayload,
  isDue,
  loadScheduledKpis,
  postKpiResult,
};
