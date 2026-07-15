import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const lookupPath = path.resolve(process.cwd(), "table", "lookup", "c_instype.sql");

test("c_instype lookup preserves the four-digit insurance codes from the source sheet", async () => {
  const sql = await readFile(lookupPath, "utf8");
  const rows = [...sql.matchAll(/^\('([^']*)', '((?:''|[^'])*)', (NULL|'(?:''|[^'])*')\)[,;]$/gm)];
  const codes = rows.map((match) => match[1]);

  assert.equal(rows.length, 110);
  assert.equal(new Set(codes).size, 110);
  assert.ok(codes.every((code) => /^\d{4}$/.test(code)));
  assert.ok(codes.includes("0100"));
  assert.ok(codes.includes("9100"));
  assert.match(sql, /docs\.google\.com\/spreadsheets[\s\S]*gid=1423146080/i);
});

test("c_instype uses the project lookup schema and collation", async () => {
  const sql = await readFile(lookupPath, "utf8");

  assert.match(sql, /CREATE TABLE `c_instype`/i);
  assert.match(sql, /`code` varchar\(4\) NOT NULL/i);
  assert.match(sql, /`instype_name` varchar\(255\) NOT NULL/i);
  assert.match(sql, /`note` varchar\(255\) DEFAULT NULL/i);
  assert.match(sql, /`insc_group` tinyint UNSIGNED DEFAULT NULL/i);
  assert.match(sql, /INSERT INTO `c_instype` \(`code`, `instype_name`, `note`\)/i);
  assert.match(sql, /PRIMARY KEY \(`code`\)/i);
  assert.match(sql, /DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci/i);
  assert.doesNotMatch(sql, /utf8mb4/i);
  assert.ok(sql.indexOf("INSERT INTO `c_instype`") < sql.indexOf("DROP TABLE IF EXISTS `c_inscl`"));
});
