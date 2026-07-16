import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("c_person_nation preserves the official RACE/NATION codes", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "table", "lookup", "c_person_nation.sql"), "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_person_nation`/i);
  assert.match(sql, /`code` varchar\(3\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('099', 'ไทย', ''\)/);
  assert.match(sql, /\('999', 'ไม่ระบุ', ''\)/);
  // cancelled codes keep their note verbatim
  assert.match(sql, /\('204', 'แม้ว', 'ยกเลิก  ไปใช้รหัส 082 แทน'\)/);
  // 3-digit zero-padded codes only, all 272 rows present
  assert.equal((sql.match(/^\s*\('\d{3}',/gm) || []).length, 272);
});
