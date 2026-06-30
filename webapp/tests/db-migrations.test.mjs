import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
