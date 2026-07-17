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
  assert.match(sql, /`is_active` tinyint\(1\) NOT NULL DEFAULT 1/i);
  assert.match(
    sql,
    /ALTER TABLE `c_specialpp_ppspecial`\s+ADD COLUMN IF NOT EXISTS `is_active` tinyint\(1\) NOT NULL DEFAULT 1 AFTER `note`/i
  );
  assert.match(sql, /COLLATE=utf8mb3_general_ci/i);
  assert.match(sql, /\('1B0030', 'ตรวจคัดกรองความเสี่ยง\/โรคมะเร็งเต้านมได้ผลปกติ/);
  assert.match(sql, /\('1C21', 'การปรับเปลี่ยนพฤติกรรมการบริโภคอาหารอย่างเข้มข้น'/);
  assert.match(sql, /\('1K16', 'การประเมินภาวะขาดสารอาหาร/);
  assert.equal((sql.match(/\('[A-Z0-9]{1,6}',/g) || []).length, 377);
});

test("c_specialpp_ppspecial backfills HOSxP master codes found in raw specialpp data", async () => {
  const sql = await readFile(
    path.resolve(process.cwd(), "table", "lookup", "c_specialpp_ppspecial.sql"),
    "utf8"
  );

  const deprecated = [
    "1B003", "1B028", "1B113", "1B114", "1B123", "1B124", "1B125", "1B127", "1B128",
    "1B004", "1B026", "1B027", "1B034", "1B115", "1B116", "1B117", "1B12", "1B129",
    "1B13", "1B14", "1B15", "1B16", "1B17", "1B18", "1B2", "1B20", "1B21", "1B22",
    "1B23", "1B24", "1B25", "1B27", "1B3", "1B4",
  ];
  for (const code of deprecated) {
    assert.match(
      sql,
      new RegExp(`\\('${code}', '[^']*', NULL, '[^']*', 0\\)`),
      `expected ${code} to be inserted with is_active = 0`
    );
  }

  for (const code of ["1B50", "1B53"]) {
    assert.match(
      sql,
      new RegExp(`\\('${code}', '[^']*', NULL, '[^']*', 1\\)`),
      `expected ${code} to be inserted with is_active = 1`
    );
  }
});
