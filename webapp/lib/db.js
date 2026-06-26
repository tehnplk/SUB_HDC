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
