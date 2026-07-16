import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_epi_vaccinetype preserves the official codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_epi_vaccinetype.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_epi_vaccinetype`/i);
  assert.match(sql, /`code` varchar\(6\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('10', 'บีซีจี'\)/);
  assert.match(sql, /\('HPVG93', 'เอชพีวี \(การ์ดาซิล 9 สายพันธุ์\)'\)/);
  assert.equal((sql.match(/^\s*\('[^']*',/gm) || []).length, 159);
});
