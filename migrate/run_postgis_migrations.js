const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const { Client } = require("pg");

try {
  process.loadEnvFile(path.join(__dirname, "..", "webapp", ".env"));
} catch {}

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "postgis");
const LOCK_NAME = "sub_hdc_postgis_migrations";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function migrationIdFromPath(filePath) {
  return path.basename(filePath).replace(/\.sql$/i, "");
}

function migrationChecksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
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
    host: env.GIS_DB_HOST || "postgis",
    port: Number(env.GIS_DB_PORT || 5432),
    user: env.GIS_DB_USER || "postgres",
    password: env.GIS_DB_PASSWORD || "",
    database: env.GIS_DB_DATABASE || "sub_hdc_gis",
    connectionTimeoutMillis: 5000,
  };
}

async function connectWithRetry(config, retries = 180, delayMs = 1000, ClientClass = Client) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const client = new ClientClass(config);
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      console.log(`PostGIS migration connection retry ${attempt}/${retries}: ${error.message}`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.postgis_schema_migrations (
      id varchar(255) PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT current_timestamp
    )
  `);
}

async function appliedMigration(client, id) {
  const result = await client.query(
    "SELECT checksum FROM public.postgis_schema_migrations WHERE id = $1 LIMIT 1",
    [id]
  );
  return result.rows[0] || null;
}

async function applyMigrationFile(client, filePath) {
  const id = migrationIdFromPath(filePath);
  const sql = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
  const checksum = migrationChecksum(sql);
  const applied = await appliedMigration(client, id);

  if (applied) {
    if (applied.checksum !== checksum) {
      throw new Error(`PostGIS migration ${id} changed after it was applied; add a new migration file`);
    }
    return { id, status: "skipped" };
  }

  await client.query("BEGIN");
  try {
    if (sql) await client.query(sql);
    await client.query(
      "INSERT INTO public.postgis_schema_migrations (id, checksum) VALUES ($1, $2)",
      [id, checksum]
    );
    await client.query("COMMIT");
    return { id, status: sql ? "applied" : "empty" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function runMigrations(options = {}) {
  const migrationsDir = options.migrationsDir || DEFAULT_MIGRATIONS_DIR;
  const files = await listMigrationFiles(migrationsDir);
  if (!files.length) {
    console.log("PostGIS migrations: no migration files found");
    return [];
  }

  const client = options.client || await connectWithRetry(
    options.connectionConfig || getConnectionConfig(options.env),
    options.retries ?? 180,
    options.delayMs ?? 1000,
    options.ClientClass || Client
  );
  const ownsClient = !options.client;

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_NAME]);
    await ensureMigrationsTable(client);
    const results = [];
    for (const file of files) {
      const result = await applyMigrationFile(client, file);
      console.log(`PostGIS migration ${result.status}: ${result.id}`);
      results.push(result);
    }
    return results;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_NAME]).catch(() => {});
    if (ownsClient) await client.end();
  }
}

async function main() {
  await runMigrations();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`PostGIS migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  appliedMigration,
  applyMigrationFile,
  connectWithRetry,
  ensureMigrationsTable,
  getConnectionConfig,
  listMigrationFiles,
  migrationChecksum,
  migrationIdFromPath,
  runMigrations,
};
