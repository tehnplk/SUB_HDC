const fs = require("node:fs/promises");
const path = require("node:path");

const mysql = require("mysql2/promise");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), "table_update");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function migrationIdFromPath(filePath) {
  return path.basename(filePath).replace(/\.sql$/i, "");
}

async function listMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  try {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
      .map((entry) => path.join(migrationsDir, entry.name))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function getConnectionConfig(env = process.env) {
  return {
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
    multipleStatements: true,
  };
}

async function connectWithRetry(config, retries = 180, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await mysql.createConnection(config);
    } catch (error) {
      lastError = error;
      console.log(`DB migration connection retry ${attempt}/${retries}: ${error.message}`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id varchar(100) PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT current_timestamp
    )
  `);
}

async function hasMigration(connection, id) {
  const [rows] = await connection.query(
    "SELECT id FROM schema_migrations WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

async function applyMigrationFile(connection, filePath) {
  const id = migrationIdFromPath(filePath);
  if (await hasMigration(connection, id)) {
    return { id, status: "skipped" };
  }

  const sql = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
  if (!sql) {
    await connection.query("INSERT INTO schema_migrations (id) VALUES (?)", [id]);
    return { id, status: "empty" };
  }

  await connection.query(sql);
  await connection.query("INSERT INTO schema_migrations (id) VALUES (?)", [id]);
  return { id, status: "applied" };
}

async function runMigrations(options = {}) {
  const migrationsDir = options.migrationsDir || DEFAULT_MIGRATIONS_DIR;
  const files = await listMigrationFiles(migrationsDir);
  if (!files.length) {
    console.log("DB migrations: no migration files found");
    return [];
  }

  const connection = await connectWithRetry(
    options.connectionConfig || getConnectionConfig(options.env),
    options.retries ?? 180,
    options.delayMs ?? 1000
  );

  try {
    await ensureMigrationsTable(connection);
    const results = [];
    for (const file of files) {
      const result = await applyMigrationFile(connection, file);
      console.log(`DB migration ${result.status}: ${result.id}`);
      results.push(result);
    }
    return results;
  } finally {
    await connection.end();
  }
}

async function main() {
  await runMigrations();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`DB migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  applyMigrationFile,
  ensureMigrationsTable,
  getConnectionConfig,
  hasMigration,
  listMigrationFiles,
  migrationIdFromPath,
  runMigrations,
};
