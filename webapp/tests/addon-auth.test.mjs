import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("../app/api/addon-auth/route.js", import.meta.url), "utf8");

test("addon-auth is protected by the JWT_KEY-backed Bearer token", () => {
  // ตรวจ JWT ด้วย verifyApiJwt (HS256 + JWT_KEY) จาก Authorization: Bearer
  assert.match(routeSource, /verifyApiJwt/);
  assert.match(routeSource, /Bearer\\s\+/);
  assert.match(routeSource, /authorization/i);
  assert.match(routeSource, /status: 401/);
});

test("addon-auth validates session-id then looks up the user by cid_hash", () => {
  assert.match(routeSource, /session-id is required/);
  assert.match(routeSource, /status: 400/);
  assert.match(routeSource, /WHERE u\.cid_hash = \?/);
  // รองรับทั้ง GET (?session-id=) และ POST (body)
  assert.match(routeSource, /searchParams\.get\("session-id"\)/);
});

test("addon-auth returns the full user row (incl role_name + hospname) with parsed profile", () => {
  assert.match(routeSource, /SELECT u\.\*, r\.role AS role_name, h\.hospname/);
  assert.match(routeSource, /\.\.\.row/);
  assert.match(routeSource, /profile: parseProfile\(row\.profile\)/);
  assert.match(routeSource, /is_active: Number\(row\.is_active\) === 1/);
});
