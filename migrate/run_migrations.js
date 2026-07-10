const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const mysql = require("mysql2/promise");

// ใน container ได้ env จาก compose env_file อยู่แล้ว — โหลด webapp/.env เผื่อ
// รันตรง ๆ นอก docker (จาก repo root: `node migrate/run_migrations.js`)
// env ที่ตั้งมาก่อนชนะค่าในไฟล์ ไฟล์ไม่มี (เช่นใน container) ก็ข้ามเงียบ ๆ
try {
  process.loadEnvFile(path.join(__dirname, "..", "webapp", ".env"));
} catch {}

// table_update/ กับ table/ อยู่ในโฟลเดอร์ migrate/ เอง — อิง __dirname เพื่อให้
// รันได้ทั้ง local (จาก cwd ไหนก็ได้) และใน container (mount ทับ /migrate/...)
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "table_update");
// dump ตาราง lookup (c_hospital, c_hostype, ...)
const DEFAULT_LOOKUP_DIR = path.join(__dirname, "table", "lookup");

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

// id \u0E02\u0E2D\u0E07 lookup \u0E1C\u0E39\u0E01\u0E01\u0E31\u0E1A "\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E44\u0E1F\u0E25\u0E4C" (content hash) \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E0A\u0E37\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C \u2014 \u0E44\u0E0B\u0E15\u0E4C\u0E17\u0E38\u0E01\u0E17\u0E35\u0E48\u0E23\u0E31\u0E19\u0E41\u0E04\u0E48
// `docker compose up -d --build` \u0E14\u0E31\u0E07\u0E19\u0E31\u0E49\u0E19\u0E1E\u0E2D\u0E41\u0E01\u0E49 dump (\u0E40\u0E0A\u0E48\u0E19 \u0E40\u0E1E\u0E34\u0E48\u0E21 \u0E23\u0E1E.\u0E43\u0E2B\u0E21\u0E48) hash \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19
// \u2192 \u0E16\u0E39\u0E01\u0E42\u0E2B\u0E25\u0E14\u0E0B\u0E49\u0E33\u0E40\u0E2D\u0E07\u0E23\u0E2D\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B \u0E42\u0E14\u0E22\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E14\u0E34\u0E21\u0E17\u0E35\u0E48\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E25\u0E49\u0E27\u0E16\u0E39\u0E01\u0E02\u0E49\u0E32\u0E21. dump \u0E40\u0E1B\u0E47\u0E19
// DROP TABLE IF EXISTS + CREATE + INSERT \u0E08\u0E36\u0E07\u0E23\u0E31\u0E19\u0E0B\u0E49\u0E33\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22
function lookupMigrationId(filePath, sql) {
  const hash = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 12);
  return `lookup_${migrationIdFromPath(filePath)}_${hash}`;
}

async function applyLookupFile(connection, filePath) {
  const sql = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
  const id = lookupMigrationId(filePath, sql);
  if (!sql) {
    return { id, status: "empty" };
  }
  if (await hasMigration(connection, id)) {
    return { id, status: "skipped" };
  }

  await connection.query(sql);
  await connection.query("INSERT INTO schema_migrations (id) VALUES (?)", [id]);
  return { id, status: "applied" };
}

async function runMigrations(options = {}) {
  const migrationsDir = options.migrationsDir || DEFAULT_MIGRATIONS_DIR;
  const lookupDir = options.lookupDir || DEFAULT_LOOKUP_DIR;
  const files = await listMigrationFiles(migrationsDir);
  const lookupFiles = await listMigrationFiles(lookupDir);
  if (!files.length && !lookupFiles.length) {
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
    for (const file of lookupFiles) {
      const result = await applyLookupFile(connection, file);
      console.log(`DB lookup ${result.status}: ${result.id}`);
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
  applyLookupFile,
  applyMigrationFile,
  ensureMigrationsTable,
  getConnectionConfig,
  hasMigration,
  listMigrationFiles,
  lookupMigrationId,
  migrationIdFromPath,
  runMigrations,
};
