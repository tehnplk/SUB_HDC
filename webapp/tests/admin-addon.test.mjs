import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../app/api/admin/addon-url/route.js", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/admin/addon/page.js", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../app/admin/addon/addon-manager.jsx", import.meta.url), "utf8");
const floatingMenuSource = readFileSync(new URL("../components/floating-user-menu.jsx", import.meta.url), "utf8");
const moduleHeaderSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");

test("admin addon page and API enforce admin access", () => {
  assert.match(pageSource, /isAdminSession\(session\)/);
  assert.match(pageSource, /redirect\("\/login\?callbackUrl=\/admin\/addon"\)/);
  // ทุก HTTP method ของ API ต้องผ่าน requireAdminApi
  assert.match(apiSource, /export async function GET[\s\S]*?requireAdminApi\(\)/);
  assert.match(apiSource, /export async function POST[\s\S]*?requireAdminApi\(\)/);
  assert.match(apiSource, /export async function PATCH[\s\S]*?requireAdminApi\(\)/);
  assert.match(apiSource, /export async function DELETE[\s\S]*?requireAdminApi\(\)/);
});

test("admin addon API performs CRUD on c_addon_url", () => {
  assert.match(apiSource, /SELECT id, url, system_name, is_active, note FROM c_addon_url/);
  assert.match(apiSource, /INSERT INTO c_addon_url/);
  assert.match(apiSource, /UPDATE c_addon_url SET/);
  assert.match(apiSource, /DELETE FROM c_addon_url WHERE id = \?/);
});

test("admin menu exposes 'จัดการระบบ Add-On' only to administrators", () => {
  assert.match(floatingMenuSource, /isAdmin \?/);
  assert.match(floatingMenuSource, /href: "\/admin\/addon", label: "จัดการระบบ Add-On"/);
});

test("addon admin page has its own breadcrumb before the generic /admin entry", () => {
  const addonIdx = moduleHeaderSource.indexOf('prefix: "/admin/addon"');
  const adminIdx = moduleHeaderSource.indexOf('prefix: "/admin"');
  assert.ok(addonIdx !== -1 && adminIdx !== -1 && addonIdx < adminIdx);
});

test("addon manager fetches the admin API and supports add/edit/delete", () => {
  assert.match(clientSource, /fetch\("\/api\/admin\/addon-url"/);
  assert.match(clientSource, /method: isNew \? "POST" : "PATCH"/);
  assert.match(clientSource, /method: "DELETE"/);
});
