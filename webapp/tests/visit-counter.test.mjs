import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const badgeSource = readFileSync(new URL("../components/visit-counter-badge.jsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../app/api/visit-counter/route.js", import.meta.url), "utf8");
const titleSource = readFileSync(new URL("../components/dashboard-page-title.jsx", import.meta.url), "utf8");
const migrationSource = readFileSync(
  new URL("../../migrate/table_update/20260711_create_visit_counter.sql", import.meta.url),
  "utf8"
);

test("visit counter badge counts once per session, not on reload", () => {
  assert.match(badgeSource, /"use client"/);
  assert.match(badgeSource, /visitCounterBadge/);
  assert.match(badgeSource, /\/api\/visit-counter/);
  // POST เฉพาะครั้งแรกของ session — sessionStorage คง flag ข้าม reload/refresh
  // → reload ใช้ GET ไม่นับซ้ำ
  assert.match(badgeSource, /sessionStorage/);
  assert.match(badgeSource, /alreadyCounted \? "GET" : "POST"/);
  assert.match(badgeSource, /จำนวนผู้เข้าใช้ \{total\.toLocaleString\("th-TH"\)\} ครั้ง/);
  assert.doesNotMatch(badgeSource, /lucide-react/);
});

test("shared page title mounts the visit counter after the connect status", () => {
  assert.match(titleSource, /VisitCounterBadge/);
  assert.match(
    titleSource,
    /dbStatusLabel[\s\S]*?<VisitCounterBadge \/>/
  );
});

test("visit counter API increments and reads the shared total", () => {
  assert.match(apiSource, /export async function GET/);
  assert.match(apiSource, /export async function POST/);
  assert.match(apiSource, /ON DUPLICATE KEY UPDATE `total` = `total` \+ 1/);
  assert.match(apiSource, /SELECT `total` FROM `visit_counter`/);
});

test("visit counter badge is a subtle inline chip, visible on mobile", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const badgeRule = css.slice(css.indexOf(".visitCounterBadge {"));
  assert.match(badgeRule, /display: inline-flex/);
  assert.match(badgeRule, /font-weight: 400/);
  assert.doesNotMatch(badgeRule.slice(0, badgeRule.indexOf("}")), /position: (absolute|fixed)/);
  const mobileHidden = /@media[^{]*\{[^@]*\.visitCounterBadge\s*\{[^}]*display: none/;
  assert.doesNotMatch(css, mobileHidden);
});

test("migration creates the single-row visit_counter table", () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS `visit_counter`/);
  assert.match(migrationSource, /`total` bigint/);
  assert.match(migrationSource, /VALUES \(1, 0\)/);
});
