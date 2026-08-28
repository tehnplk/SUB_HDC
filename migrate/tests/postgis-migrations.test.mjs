import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const migrations = require("../run_postgis_migrations.js");

test("PostGIS runner lists only top-level SQL files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sub-hdc-postgis-"));
  try {
    await writeFile(path.join(dir, "b.sql"), "SELECT 2;");
    await writeFile(path.join(dir, "a.sql"), "SELECT 1;");
    await writeFile(path.join(dir, "note.txt"), "ignored");
    const files = await migrations.listMigrationFiles(dir);
    assert.deepEqual(files.map((file) => path.basename(file)), ["a.sql", "b.sql"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PostGIS connection uses GIS-specific environment variables", () => {
  assert.deepEqual(
    migrations.getConnectionConfig({
      GIS_DB_HOST: "postgis",
      GIS_DB_PORT: "5432",
      GIS_DB_USER: "postgres",
      GIS_DB_PASSWORD: "secret",
      GIS_DB_DATABASE: "sub_hdc_gis",
    }),
    {
      host: "postgis",
      port: 5432,
      user: "postgres",
      password: "secret",
      database: "sub_hdc_gis",
      connectionTimeoutMillis: 5000,
    }
  );
});

test("compose runs PostGIS migrations before the webapp", async () => {
  const compose = await import("node:fs/promises").then(({ readFile }) =>
    readFile(path.resolve(process.cwd(), "..", "docker-compose.yml"), "utf8")
  );
  assert.match(compose, /postgis-migrate:[\s\S]*command: \["node", "run_postgis_migrations\.js"\]/);
  assert.match(compose, /- \.\/migrate\/postgis:\/migrate\/postgis:ro/);
  assert.match(compose, /webapp:[\s\S]*postgis-migrate:\s*\n\s*condition: service_completed_successfully/);
});

test("boundary migration contains canonical schemas, upserts, and record guards", async () => {
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(path.resolve(process.cwd(), "postgis", "20260828_create_boundaries.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.district_boundary/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.subdistrict_boundary/);
  assert.match(sql, /geometry\(MultiPolygon, 4326\)/);
  assert.match(sql, /ON CONFLICT \(code\) DO UPDATE/);
  assert.match(sql, /Expected 9 district boundaries/);
  assert.match(sql, /Expected 93 subdistrict boundaries/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
});
