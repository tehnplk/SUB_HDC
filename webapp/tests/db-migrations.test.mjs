import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const migrations = require("../lib/run_migrations.js");

async function withTempDir(callback) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-migrations-"));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function cFileTableNames(source) {
  return [...source.matchAll(/VALUES\s*\('([^']+)'/g)].map((match) => match[1]);
}

function hasHospcodeColumn(source) {
  return /`\s*hospcode\s*`/i.test(source);
}

test("listMigrationFiles returns sorted sql files only", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "20260630_b.sql"), "SELECT 2;");
    await writeFile(path.join(dir, "20260630_a.sql"), "SELECT 1;");
    await writeFile(path.join(dir, "README.md"), "ignore");

    const files = await migrations.listMigrationFiles(dir);

    assert.deepEqual(files.map((file) => path.basename(file)), [
      "20260630_a.sql",
      "20260630_b.sql",
    ]);
  });
});

test("applyMigrationFile skips migrations already recorded", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "20260630_aes_varchar_2000.sql");
    await writeFile(file, "ALTER TABLE `home` MODIFY `house` varchar(2000);");
    const calls = [];
    const connection = {
      async query(sql, values) {
        calls.push({ sql, values });
        if (/SELECT id FROM schema_migrations/.test(sql)) {
          return [[{ id: "20260630_aes_varchar_2000" }]];
        }
        return [[]];
      },
    };

    const result = await migrations.applyMigrationFile(connection, file);

    assert.deepEqual(result, { id: "20260630_aes_varchar_2000", status: "skipped" });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /SELECT id FROM schema_migrations/);
  });
});

test("applyMigrationFile applies sql and records migration id", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "20260630_aes_varchar_2000.sql");
    await writeFile(file, "\uFEFFALTER TABLE `home` MODIFY `house` varchar(2000);");
    const calls = [];
    const connection = {
      async query(sql, values) {
        calls.push({ sql, values });
        if (/SELECT id FROM schema_migrations/.test(sql)) return [[]];
        return [[]];
      },
    };

    const result = await migrations.applyMigrationFile(connection, file);

    assert.deepEqual(result, { id: "20260630_aes_varchar_2000", status: "applied" });
    assert.equal(calls.length, 3);
    assert.equal(calls[1].sql, "ALTER TABLE `home` MODIFY `house` varchar(2000);");
    assert.match(calls[2].sql, /INSERT INTO schema_migrations/);
    assert.deepEqual(calls[2].values, ["20260630_aes_varchar_2000"]);
  });
});

test("initial table schemas define hospcode columns as varchar 10", async () => {
  const tableDir = path.resolve(process.cwd(), "..", "table");
  const files = (await readdir(tableDir)).filter((file) => file.endsWith(".sql"));
  const offenders = [];

  for (const file of files) {
    const source = await readFile(path.join(tableDir, file), "utf8");
    if (!hasHospcodeColumn(source)) continue;
    if (/`\s*hospcode\s*`\s+varchar\(5\)/i.test(source)) offenders.push(file);
  }

  assert.deepEqual(offenders, []);
});

test("hospcode varchar 10 migration covers c_file tables with hospcode", async () => {
  const tableDir = path.resolve(process.cwd(), "..", "table");
  const cFileSource = await readFile(path.join(tableDir, "c_file.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "..",
    "table_update",
    "20260701_hospcode_varchar_10.sql"
  );
  const source = await readFile(migrationPath, "utf8");
  const expectedTables = [];

  for (const table of cFileTableNames(cFileSource)) {
    const tablePath = path.join(tableDir, `${table}.sql`);
    const tableSource = await readFile(tablePath, "utf8");
    if (hasHospcodeColumn(tableSource)) expectedTables.push(table);
  }

  const alterStatements = [
    ...source.matchAll(
      /ALTER\s+TABLE\s+`([^`]+)`\s+MODIFY\s+`hospcode`\s+varchar\(10\)\s+NOT\s+NULL\s+DEFAULT\s+'';/gi
    ),
  ];
  const actualTables = alterStatements.map((match) => match[1]);

  assert.deepEqual(actualTables, expectedTables);
  assert.equal(new Set(actualTables).size, actualTables.length);
});

test("address house_id is AES-sized in initial schema and migration", async () => {
  const tableDir = path.resolve(process.cwd(), "..", "table");
  const addressSource = await readFile(path.join(tableDir, "address.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "..",
    "table_update",
    "20260702_address_house_id_aes_varchar_1000.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(addressSource, /`house_id`\s+varchar\(1000\)\s+NOT\s+NULL\s+DEFAULT\s+''/i);
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`address`\s+MODIFY\s+`house_id`\s+varchar\(1000\)\s+NOT\s+NULL\s+DEFAULT\s+'';/i
  );
});

test("log import file schema stores uploaded file size after file name", async () => {
  const tableDir = path.resolve(process.cwd(), "..", "table");
  const schemaSource = await readFile(path.join(tableDir, "log_import_file.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "..",
    "table_update",
    "20260702_log_import_file_file_size.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(
    schemaSource,
    /`file_name`\s+varchar\(255\)\s+NOT\s+NULL\s+DEFAULT\s+''[\s\S]*`file_size`\s+bigint\(20\)\s+DEFAULT\s+NULL/i
  );
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`log_import_file`\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+`file_size`\s+bigint\(20\)\s+DEFAULT\s+NULL\s+AFTER\s+`file_name`;/i
  );
});

test("service chiefcomp is text in initial schema and migration", async () => {
  const tableDir = path.resolve(process.cwd(), "..", "table");
  const serviceSource = await readFile(path.join(tableDir, "service.sql"), "utf8");
  const migrationPath = path.resolve(
    process.cwd(),
    "..",
    "table_update",
    "20260703_service_chiefcomp_text.sql"
  );
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(serviceSource, /`chiefcomp`\s+text\s+NOT\s+NULL/i);
  assert.doesNotMatch(serviceSource, /`chiefcomp`\s+varchar\(/i);
  assert.match(
    migrationSource,
    /ALTER\s+TABLE\s+`service`\s+MODIFY\s+`chiefcomp`\s+text\s+NOT\s+NULL;/i
  );
});
