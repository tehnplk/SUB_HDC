import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("c_labfu_code preserves the official LABFU code master", async () => {
  const sql = await readFile(
    path.resolve(process.cwd(), "table", "lookup", "c_labfu_code.sql"),
    "utf8"
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_labfu_code`/i);
  assert.match(sql, /`code` varchar\(7\) NOT NULL/i);
  assert.match(sql, /`lab_name_en` varchar\(255\) NOT NULL/i);
  assert.match(sql, /`lab_name_th` varchar\(255\) NOT NULL/i);
  assert.match(sql, /PRIMARY KEY \(`code`, `lab_name_en`\)/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('0290201', 'Chromosome analysis, breakage study, whole blood'/);
  assert.match(sql, /\('0749304', 'Corona virus disease 2019/);
  assert.equal((sql.match(/\('[0-9]{7}',/g) || []).length, 1437);
});
