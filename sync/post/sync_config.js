const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://subhdc.plkhealth.go.th";
const DEFAULT_POST_PATH = "/api/data-sync-in";
const DEFAULT_GET_PATHS = { "sql-command": "/api/sync-sql" };
const JWT_TTL_SECONDS = 5 * 60;

// config หลักของระบบ sync — base_url + secret (sign JWT HS256) + endpoint แยก get/post
const CONFIG_FILE = process.env.SYNC_CONFIG_FILE || path.resolve(__dirname, "../config_sync.json");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function loadConfig() {
  return readJson(CONFIG_FILE) || {};
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

// ลำดับความสำคัญ: config_sync.json > env SYNC_TARGET_URL (ใช้เฉพาะ origin) > ค่า default
function resolveBaseUrl() {
  const fromSync = normalizeBaseUrl(loadConfig().base_url);
  if (fromSync) return fromSync;

  if (process.env.SYNC_TARGET_URL) {
    try {
      return new URL(process.env.SYNC_TARGET_URL).origin;
    } catch {
      // ค่า env ไม่ใช่ URL ที่ถูกต้อง ใช้ default แทน
    }
  }

  return DEFAULT_BASE_URL;
}

function getSecret() {
  return String(loadConfig().secret || "").trim();
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// sync-sql เป็น endpoint เดียวที่ต้อง auth — sign JWT HS256 สดทุกครั้งด้วย
// SYNC_SQL_JWT_SECRET ของ center (เก็บใน config_sync.json คีย์ "secret")
// อายุสั้น (5 นาที) เพราะ signใหม่ได้ทุกครั้งที่เรียก ไม่ต้อง cache token
function signJwt(payload) {
  const secret = getSecret();
  if (!secret) {
    throw new Error(`sync secret not configured in ${CONFIG_FILE}`);
  }

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + JWT_TTL_SECONDS })
  )}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${body}.${signature}`;
}

// header สำหรับ endpoint ที่ต้อง auth (sync-sql) — endpoint POST อื่น
// (/api/data-sync-in) เป็น public ตาม SSJ_API_ENDPOINT.md ไม่ต้องแนบ token
function buildAuthHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${signJwt({ sub_center_name: process.env.CENTER_NAME || "" })}`,
    ...extra,
  };
}

function resolvePostUrl(name) {
  const configured = loadConfig()["endpoint-post"];
  const endpointPath = normalizePath(
    typeof configured === "string" ? configured : configured?.[name]
  ) || DEFAULT_POST_PATH;
  return resolveBaseUrl() + endpointPath;
}

function resolveGetUrl(name) {
  const endpoints = loadConfig()["endpoint-get"] || {};
  const endpointPath = normalizePath(endpoints[name]) || DEFAULT_GET_PATHS[name] || "";
  if (!endpointPath) {
    throw new Error(`Unknown sync GET endpoint: ${name}`);
  }
  return resolveBaseUrl() + endpointPath;
}

module.exports = {
  CONFIG_FILE,
  buildAuthHeaders,
  getSecret,
  loadConfig,
  resolveBaseUrl,
  resolveGetUrl,
  resolvePostUrl,
  signJwt,
};
