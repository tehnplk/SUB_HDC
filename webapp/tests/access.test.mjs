import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { decideAccess, policyFor, requireAccess } from "../lib/access.mjs";

const APP_DIR = fileURLToPath(new URL("../app", import.meta.url));

const USERS = {
  anon: undefined,
  guest: { roleId: 4 },
  user: { roleId: 3 },
  superuser: { roleId: 2 },
  admin: { roleId: 1 },
  envAdmin: { isConfiguredUser: true },
  noRole: { roleId: undefined },
};

// [who, method, path, expected] — expected: "ok", HTTP status, or "302 <Location prefix>"
const CASES = [
  ["anon", "GET", "/api/gis/vulnerable", 401],
  ["guest", "GET", "/api/gis/vulnerable", 403],
  ["noRole", "GET", "/api/gis/vulnerable", 403],
  ["user", "GET", "/api/gis/vulnerable", "ok"],
  ["superuser", "POST", "/api/gis/vulnerable", "ok"],
  ["guest", "GET", "/api/gis/person-search", 403],
  ["user", "GET", "/api/gis/person-search", "ok"],
  ["anon", "GET", "/api/gis/hospitals", "ok"],
  ["anon", "GET", "/api/gis/c-vulnerable", "ok"],
  ["anon", "GET", "/api/gis/subdistrict-boundary", "ok"],

  ["anon", "GET", "/gis", "302 /login?callbackUrl=%2Fgis"],
  ["guest", "GET", "/gis", "302 /err?msg="],
  ["user", "GET", "/gis", "ok"],
  ["anon", "GET", "/quality", "ok"],
  ["guest", "GET", "/quality/person-dup", "302 /err?msg="],

  ["user", "GET", "/admin", "302 /err?msg="],
  ["admin", "GET", "/admin/addon", "ok"],
  ["envAdmin", "GET", "/admin", "ok"],
  ["anon", "GET", "/api/admin/users", 401],
  ["superuser", "PATCH", "/api/admin/users", 403],
  ["admin", "DELETE", "/api/admin/addon-url", "ok"],

  ["guest", "POST", "/api/upload-zip", 403],
  ["user", "POST", "/api/import-zip", "ok"],
  ["guest", "GET", "/api/quality/person-dup", 403],
  ["guest", "POST", "/api/ai/chat", 403],

  ["anon", "GET", "/api/dm-ht-count/export", "302 /error/msg?msg="],
  ["guest", "GET", "/api/quality/person-dup/export", "302 /err?msg="],
  ["guest", "GET", "/api/ai/export/a.xlsx", "302 /err?msg="],
  ["user", "GET", "/api/visit-monthly-workload/export", "ok"],

  ["anon", "GET", "/api/visit-counter", "ok"],
  ["anon", "POST", "/api/visit-counter", 401],
  ["guest", "POST", "/api/visit-counter", "ok"],

  ["anon", "GET", "/api/addon-auth", "ok"],
  ["anon", "GET", "/gisx", "ok"],
];

for (const [who, method, pathname, expected] of CASES) {
  test(`${who} ${method} ${pathname} → ${expected}`, () => {
    const response = decideAccess({ user: USERS[who], pathname, method });
    if (expected === "ok") {
      assert.equal(response, null);
    } else if (typeof expected === "number") {
      assert.equal(response?.status, expected);
      assert.match(response.headers.get("content-type"), /json/);
    } else {
      const [status, location] = expected.split(" ");
      assert.equal(response?.status, Number(status));
      assert.ok(response.headers.get("Location").startsWith(location), response.headers.get("Location"));
    }
  });
}

test("proxy origin makes Location absolute; route handlers keep it relative", () => {
  const withOrigin = decideAccess({ pathname: "/gis", search: "?a=1", origin: "https://x.test" });
  assert.equal(withOrigin.headers.get("Location"), "https://x.test/login?callbackUrl=%2Fgis%3Fa%3D1");
  assert.equal(decideAccess({ pathname: "/gis", search: "?a=1" }).headers.get("Location"), "/login?callbackUrl=%2Fgis%3Fa%3D1");
});

test("longest prefix wins so exports under /api/ai redirect instead of JSON", () => {
  assert.equal(policyFor("/api/ai/export/a.xlsx").kind, "export");
  assert.equal(policyFor("/api/ai/chat", "POST").kind, "api");
});

// ทุก handler ที่ตารางบอกว่าต้องป้องกัน ต้องเรียก requireAccess เอง (กันกรณี proxy ไม่ครอบ)
// และ handler ที่เรียก requireAccess ต้องมี policy (ไม่งั้น throw ตอนรันจริง)
test("every API route handler is wired to the policy table", () => {
  const routes = readdirSync(path.join(APP_DIR, "api"), { recursive: true })
    .filter((file) => path.basename(file) === "route.js");
  assert.ok(routes.length > 20);

  for (const file of routes) {
    const source = readFileSync(path.join(APP_DIR, "api", file), "utf8");
    const pathname = `/api/${path.dirname(file).split(path.sep).join("/")}`.replace(/\[[^\]]+\]/g, "x");
    const handlers = source.split(/(?=export async function (?:GET|POST|PUT|PATCH|DELETE)\b)/).slice(1);
    for (const handler of handlers) {
      const method = handler.match(/^export async function (\w+)/)[1];
      const guarded = /await requireAccess\(request\)/.test(handler);
      assert.equal(guarded, Boolean(policyFor(pathname, method)), `${method} ${pathname}`);
    }
  }
});

test("requireAccess fails loudly for a route that has no policy", async () => {
  await assert.rejects(requireAccess(new Request("http://localhost/api/unlisted")), /No access policy/);
});

test("AUTH_TEST_BYPASS lets route tests skip the session outside production", async () => {
  const previous = { bypass: process.env.AUTH_TEST_BYPASS, env: process.env.NODE_ENV };
  try {
    process.env.AUTH_TEST_BYPASS = "1";
    process.env.NODE_ENV = "test";
    const { denied } = await requireAccess(new Request("http://localhost/api/admin/users"));
    assert.equal(denied, null);
  } finally {
    if (previous.bypass === undefined) delete process.env.AUTH_TEST_BYPASS;
    else process.env.AUTH_TEST_BYPASS = previous.bypass;
    if (previous.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.env;
  }
});
