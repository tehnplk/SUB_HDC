import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const lookupPath = path.resolve(process.cwd(), "table", "lookup", "c_chargeitem.sql");

test("c_chargeitem lookup keeps the two-digit charge category codes from the source sheet", async () => {
  const sql = await readFile(lookupPath, "utf8");
  const rows = [...sql.matchAll(/^\('([^']*)', '((?:''|[^'])*)'\)[,;]$/gm)];
  const codes = rows.map((match) => match[1]);

  assert.equal(rows.length, 18);
  assert.equal(new Set(codes).size, 18);
  assert.ok(codes.every((code) => /^\d{2}$/.test(code)));
  assert.ok(codes.includes("01"));
  assert.ok(codes.includes("05"));
  assert.ok(codes.includes("18"));
  assert.match(sql, /docs\.google\.com\/spreadsheets[\s\S]*gid=1753773719/i);
});

test("c_chargeitem uses the project lookup schema and collation", async () => {
  const sql = await readFile(lookupPath, "utf8");

  assert.match(sql, /CREATE TABLE `c_chargeitem`/i);
  assert.match(sql, /`code` varchar\(2\) NOT NULL/i);
  assert.match(sql, /`chargeitem_name` varchar\(255\) NOT NULL/i);
  assert.match(sql, /INSERT INTO `c_chargeitem` \(`code`, `chargeitem_name`\)/i);
  assert.match(sql, /PRIMARY KEY \(`code`\)/i);
  assert.match(sql, /DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci/i);
  assert.doesNotMatch(sql, /utf8mb4/i);
});
