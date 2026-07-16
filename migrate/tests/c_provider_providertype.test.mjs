import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_provider_providertype preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_provider_providertype.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_provider_providertype`/i);
  assert.match(sql, /`code` varchar\(3\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('01', 'แพทย์'\)/);
  assert.match(sql, /\('14', 'ผู้จัดการดูแล \(Care Manager: CM\)'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 20);
});
