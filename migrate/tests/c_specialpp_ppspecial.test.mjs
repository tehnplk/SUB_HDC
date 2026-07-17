import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("c_specialpp_ppspecial preserves the official Special PP codes", async () => {
  const sql = await readFile(
    path.resolve(process.cwd(), "table", "lookup", "c_specialpp_ppspecial.sql"),
    "utf8"
  );

  assert.match(sql, /DROP TABLE IF EXISTS `c_specialpp_code`/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `c_specialpp_ppspecial`/i);
  assert.match(sql, /`code` varchar\(6\) NOT NULL/i);
  assert.match(sql, /`ppspecial_name` varchar\(255\) NOT NULL/i);
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1B0030', 'ตรวจคัดกรองความเสี่ยง\/โรคมะเร็งเต้านมได้ผลปกติ/);
  assert.match(sql, /\('1C21', 'การปรับเปลี่ยนพฤติกรรมการบริโภคอาหารอย่างเข้มข้น'/);
  assert.match(sql, /\('1K16', 'การประเมินภาวะขาดสารอาหาร/);
  assert.equal((sql.match(/\('[A-Z0-9]{1,6}',/g) || []).length, 341);
});
