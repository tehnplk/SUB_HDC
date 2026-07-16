import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_provider_council preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_provider_council.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_provider_council`/i);
  assert.match(sql, /`code` varchar\(2\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('01', 'แพทยสภา'\)/);
  assert.match(sql, /\('07', 'สัตวแพทยสภา'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 7);
});
