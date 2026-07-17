import mysql from "mysql2/promise";

export function getDbConfig() {
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DB_PORT must be a valid port number");
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

export function createDbConnection(options = {}) {
  return mysql.createConnection({
    ...getDbConfig(),
    ...options,
  });
}

// Shared pool for short-lived API queries (AI tools) — avoids paying TCP +
// auth handshake per query. Kept on globalThis so Next.js dev hot reload
// reuses the same pool instead of leaking one per reload.
export function getDbPool() {
  if (!globalThis.__subHdcDbPool) {
    globalThis.__subHdcDbPool = mysql.createPool({
      ...getDbConfig(),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 50,
      enableKeepAlive: true,
    });
  }
  return globalThis.__subHdcDbPool;
}

// Pool-backed drop-in for createDbConnection: same query/end interface,
// but end() releases back to the pool instead of closing the socket.
export async function getPooledDbConnection() {
  const conn = await getDbPool().getConnection();
  return {
    query: (...args) => conn.query(...args),
    end: async () => conn.release(),
  };
}
