const mysql = require("mysql2/promise");
const { resolveTargetUrl } = require("./resolve_target_url");

const TARGET_URL = resolveTargetUrl();
const PERIOD_START = "20251001";
const DATE_SERV_PATTERN = "^[0-9]{8}$";

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

const DB_CONNECT_RETRIES = Number(process.env.SYNC_DB_CONNECT_RETRIES || 12);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.SYNC_DB_CONNECT_RETRY_DELAY_MS || 10000);

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
      if (attempt < DB_CONNECT_RETRIES) {
        await sleep(DB_CONNECT_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

function getCurrentDateServ() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
}

async function queryServiceCompleteness(connection) {
  const periodEnd = getCurrentDateServ();
  const [rows] = await connection.execute(
    `
    SELECT
      h.hospcode,
      CASE
        WHEN COUNT(s.date_serv) > 0 THEN 1
        ELSE 0
      END AS complete
    FROM (
      SELECT DISTINCT hospcode
      FROM service
      WHERE hospcode <> ''
    ) h
    LEFT JOIN service s
      ON s.hospcode = h.hospcode
      AND s.date_serv >= ?
      AND s.date_serv <= ?
      AND s.date_serv REGEXP ?
    GROUP BY h.hospcode
    ORDER BY h.hospcode
    `,
    [PERIOD_START, periodEnd, DATE_SERV_PATTERN]
  );

  return rows.map((row) => ({
    hospcode: String(row.hospcode),
    complete: Number(row.complete),
  }));
}

async function postToSsj(rows) {
  const payload = {
    sub_center_name: process.env.CENTER_NAME || "",
    topic: "service_count",
    rows,
  };

  const response = await fetch(TARGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SSJ sync failed ${response.status}: ${text}`);
  }

  return text;
}

async function main() {
  const connection = await connectWithRetry();

  try {
    const rows = await queryServiceCompleteness(connection);
    if (process.env.SYNC_DRY_RUN === "true") {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    const responseText = await postToSsj(rows);
    console.log(JSON.stringify({ success: true, row_count: rows.length, response: responseText }));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
