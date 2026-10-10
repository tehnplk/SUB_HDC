const mysql = require("mysql2/promise");

// การเชื่อมต่อ MariaDB ของทุก sync job — env มาจาก webapp/.env (env_file ของ
// compose); default ชี้ host.docker.internal:3308 สำหรับรันนอก network ของ compose
function getDbConfig(env = process.env) {
  const port = Number(env.DB_PORT || 3308);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DB_PORT must be a valid port number");
  }
  return {
    host: env.DB_HOST || "host.docker.internal",
    port,
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// container sync อาจ start ก่อน MariaDB พร้อม — ลองใหม่ก่อนยอมแพ้
async function connectWithRetry({
  connect = () => mysql.createConnection(getDbConfig()),
  retries = Number(process.env.SYNC_DB_CONNECT_RETRIES || 12),
  delayMs = Number(process.env.SYNC_DB_CONNECT_RETRY_DELAY_MS || 10000),
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await connect();
    } catch (error) {
      lastError = error;
      console.error(`db connect attempt ${attempt}/${retries} failed: ${error?.message || error}`);
      if (attempt < retries) await sleep(delayMs);
    }
  }
  throw lastError;
}

module.exports = { getDbConfig, connectWithRetry };
