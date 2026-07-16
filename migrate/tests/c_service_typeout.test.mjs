import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_service_typeout preserves the SERVICE TYPEOUT codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_service_typeout.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_service_typeout`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'จำหน่ายกลับบ้าน'\)/);
  assert.match(sql, /\('9', 'การให้บริการโดยไม่มีคำวินิจฉัยโรค'\)/);
  assert.equal((sql.match(/^\s*\('\d',/gm) || []).length, 9);
});
