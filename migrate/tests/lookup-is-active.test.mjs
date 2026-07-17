import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("every lookup master table defines is_active tinyint(1) NOT NULL DEFAULT 1", async () => {
  const dir = path.resolve(process.cwd(), "table", "lookup");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length > 0, "no lookup files found");

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    assert.match(
      sql,
      /`is_active` tinyint\(1\) NOT NULL DEFAULT 1/,
      `${file} must define is_active`
    );

    // Files using CREATE TABLE IF NOT EXISTS must also carry the ALTER guard
    // so existing production tables gain the column (CREATE IF NOT EXISTS is a
    // no-op when the table already exists). DROP+CREATE files recreate the
    // table each run, so the CREATE column alone is enough there.
    const table = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?`([^`]+)`/)?.[1];
    assert.ok(table, `${file} has no CREATE TABLE`);
    const guardsExisting =
      sql.includes(`DROP TABLE IF EXISTS \`${table}\``) ||
      new RegExp(
        `ALTER TABLE \`${table}\`\\s+ADD COLUMN IF NOT EXISTS \`is_active\``
      ).test(sql);
    assert.ok(
      guardsExisting,
      `${file} must DROP+CREATE or ALTER ADD COLUMN IF NOT EXISTS is_active for existing tables`
    );
  }
});
