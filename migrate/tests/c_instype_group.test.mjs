import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const lookupPath = path.resolve(process.cwd(), "table", "lookup", "c_instype_group.sql");

test("c_instype_group defines the four insurance groups", async () => {
  const sql = await readFile(lookupPath, "utf8");

  assert.match(sql, /\(1, 'ข้าราชการ รัฐวิสาหกิจ'\)/);
  assert.match(sql, /\(2, 'ประกันสังคม'\)/);
  assert.match(sql, /\(3, 'UC ทั้งหมด'\)/);
  assert.match(sql, /\(4, 'ต่างด้าว'\)/);
  assert.equal([...sql.matchAll(/^\(\d+, '[^']+'\)[,;]$/gm)].length, 4);
});

test("c_instype_group uses the project lookup schema and collation", async () => {
  const sql = await readFile(lookupPath, "utf8");

  assert.match(sql, /CREATE TABLE `c_instype_group`/i);
  assert.match(sql, /`id` tinyint UNSIGNED NOT NULL/i);
  assert.match(sql, /`name` varchar\(255\) NOT NULL/i);
  assert.match(sql, /PRIMARY KEY \(`id`\)/i);
  assert.match(sql, /DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci/i);
  assert.doesNotMatch(sql, /FOREIGN KEY/i);
  assert.doesNotMatch(sql, /utf8mb4/i);
});
