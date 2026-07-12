const mysql = require("mysql2/promise");

const HDC_API_BASE_URL = (process.env.HDC_API_BASE_URL || "https://opendata.moph.go.th/api").replace(/\/$/, "");
const DB_CONNECT_RETRIES = Number(process.env.SYNC_DB_CONNECT_RETRIES || 12);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.SYNC_DB_CONNECT_RETRY_DELAY_MS || 10000);
const FETCH_CONCURRENCY = Number(process.env.HDC_API_FETCH_CONCURRENCY || 4);

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
      console.error(`db connect attempt ${attempt}/${DB_CONNECT_RETRIES} failed: ${error?.message || error}`);
      if (attempt < DB_CONNECT_RETRIES) await sleep(DB_CONNECT_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`HDC API request failed ${response.status} for ${url}: ${text.slice(0, 300)}`);

  const body = JSON.parse(text);
  if (!Array.isArray(body)) throw new Error(`unexpected HDC API response for ${url}: ${text.slice(0, 300)}`);
  return body;
}

async function mapWithConcurrency(items, mapper, limit = FETCH_CONCURRENCY) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker));
  return results;
}

function requiredText(row, name) {
  const value = String(row?.[name] ?? "").trim();
  if (!value) throw new Error(`HDC report row requires ${name}`);
  return value;
}

function optionalText(row, name) {
  return String(row?.[name] ?? "").trim() || null;
}

function normalizeRow(row) {
  const reportId = Number(row?.report_id);
  if (!Number.isInteger(reportId)) throw new Error(`invalid report_id: ${row?.report_id}`);
  return [
    requiredText(row, "id"),
    reportId,
    requiredText(row, "report_name"),
    requiredText(row, "cat_id"),
    optionalText(row, "source_table"),
    optionalText(row, "main_report_id"),
    optionalText(row, "category_name"),
    optionalText(row, "main_report_name"),
  ];
}

const UPSERT_SQL = `
  INSERT INTO hdc_api_report
    (id, report_id, report_name, cat_id, source_table, main_report_id, category_name, main_report_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    report_id = VALUES(report_id),
    report_name = VALUES(report_name),
    cat_id = VALUES(cat_id),
    source_table = VALUES(source_table),
    main_report_id = VALUES(main_report_id),
    category_name = VALUES(category_name),
    main_report_name = VALUES(main_report_name)
`;

async function fetchAllReports() {
  const categories = await fetchJson(`${HDC_API_BASE_URL}/category`);
  if (!categories.length) throw new Error("HDC category payload is empty; refusing to update hdc_api_report");

  const reportGroups = await mapWithConcurrency(categories, async (category) => {
    const catId = requiredText(category, "cat_id");
    return fetchJson(`${HDC_API_BASE_URL}/report/${encodeURIComponent(catId)}`);
  });
  const rows = reportGroups.flat();
  if (!rows.length) throw new Error("HDC report payload is empty; refusing to update hdc_api_report");
  return { categoryCount: categories.length, rows };
}

async function saveReports(connection, rows) {
  if (!rows.length) throw new Error("HDC report payload is empty; refusing to write hdc_api_report");
  await connection.beginTransaction();
  try {
    for (const row of rows) await connection.execute(UPSERT_SQL, normalizeRow(row));
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const { categoryCount, rows } = await fetchAllReports();
  if (process.env.SYNC_DRY_RUN === "true") {
    console.log(JSON.stringify({ success: true, category_count: categoryCount, report_count: rows.length }));
    return;
  }

  const connection = await connectWithRetry();
  try {
    await saveReports(connection, rows);
    console.log(JSON.stringify({ success: true, category_count: categoryCount, report_count: rows.length }));
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

module.exports = { UPSERT_SQL, fetchAllReports, mapWithConcurrency, normalizeRow, saveReports };
