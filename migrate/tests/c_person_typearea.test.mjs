import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_typearea preserves the official PERSON TYPEAREA codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_typearea.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_typearea`/i);
  assert.match(sql, /`code` varchar\(1\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1', 'มีชื่ออยู่ตามทะเบียนบ้านในเขตรับผิดชอบและอยู่จริง'\)/);
  assert.match(sql, /\('5', 'มาอาศัยในเขตรับผิดชอบ/);
  assert.equal((sql.match(/^\s*\('\d',/gm) || []).length, 5);
});
