// การเชื่อมต่อ MariaDB ของ webapp image ทั้งหมด (Next routes + importer/cache
// daemon) — CommonJS เพื่อให้ daemon ที่รันด้วย node ตรง ๆ require ได้
const mysql = require("mysql2/promise");

function getDbConfig(env = process.env) {
  const port = Number(env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DB_PORT must be a valid port number");
  }

  return {
    host: env.DB_HOST || "localhost",
    port,
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

// Kept on globalThis so Next.js dev hot reload reuses the same pool instead of
// leaking one per reload.
function getDbPool() {
  if (!globalThis.__subHdcDbPool) {
    globalThis.__subHdcDbPool = mysql.createPool({
      ...getDbConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 50,
      enableKeepAlive: true,
    });
  }
  return globalThis.__subHdcDbPool;
}

// Runs fn(conn) on a pooled connection and always gives it back. When fn throws
// the connection is destroyed rather than released: it may still hold an open
// transaction, and a pooled socket must not carry that into the next request.
//
// connectionOptions (e.g. multipleStatements) → a dedicated connection, ended
// afterwards. Use it whenever fn changes session state (SET @var, SET SESSION)
// that would otherwise leak into the pool.
async function withDb(fn, { connectionOptions, pool } = {}) {
  if (connectionOptions) {
    const conn = await mysql.createConnection({ ...getDbConfig(), ...connectionOptions });
    try {
      return await fn(conn);
    } finally {
      await conn.end().catch(() => {});
    }
  }

  const conn = await (pool || getDbPool()).getConnection();
  let ok = false;
  try {
    const result = await fn(conn);
    ok = true;
    return result;
  } finally {
    if (ok) conn.release();
    else conn.destroy();
  }
}

module.exports = { getDbConfig, getDbPool, withDb };
