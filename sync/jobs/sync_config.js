const crypto = require("node:crypto");

const DEFAULT_BASE_URL = "https://subhdc.plkhealth.go.th";
const DEFAULT_POST_PATH = "/api/data-sync-in";
const DEFAULT_GET_PATHS = { "sql-command": "/api/sync-sql" };
const JWT_TTL_SECONDS = 5 * 60;

// config ทั้งหมดของระบบ sync อ่านจาก env (webapp/.env — gitignore เพราะ repo
// public) แทน config_sync.json เดิมที่ถูกลบไป:
//   SSJ_BASE_URL        origin ของ center
//   SSJ_ENDPOINT_POST   path สำหรับ POST ข้อมูล sync
//   SSJ_ENDPOINT_GET_SQL path สำหรับ GET นิยาม SQL
//   SSJ_SYNC_SECRET     secret sign JWT HS256 (endpoint GET เท่านั้นที่ auth)
// ทุกตัวมี default เป็นค่า production — ไซต์ทั่วไปตั้งแค่ SSJ_SYNC_SECRET ก็พอ

function envValue(name) {
  return String(process.env[name] || "").trim();
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

// ลำดับความสำคัญ: SSJ_BASE_URL > SYNC_TARGET_URL (ใช้เฉพาะ origin) > ค่า default
function resolveBaseUrl() {
  const fromEnv = normalizeBaseUrl(envValue("SSJ_BASE_URL"));
  if (fromEnv) return fromEnv;

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
  return envValue("SSJ_SYNC_SECRET");
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// sync-sql เป็น endpoint เดียวที่ต้อง auth — sign JWT HS256 สดทุกครั้งด้วย
// SSJ_SYNC_SECRET. อายุสั้น (5 นาที) เพราะ sign ใหม่ได้ทุกครั้งที่เรียก
// ไม่ต้อง cache token
function signJwt(payload) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("sync secret not configured (set SSJ_SYNC_SECRET in webapp/.env)");
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
// (/api/data-sync-in) เป็น public ฝั่ง center ไม่ต้องแนบ token
function buildAuthHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${signJwt({ sub_center_name: process.env.CENTER_NAME || "" })}`,
    ...extra,
  };
}

function resolvePostUrl() {
  const endpointPath = normalizePath(envValue("SSJ_ENDPOINT_POST")) || DEFAULT_POST_PATH;
  return resolveBaseUrl() + endpointPath;
}

const GET_ENV_NAMES = { "sql-command": "SSJ_ENDPOINT_GET_SQL" };

function resolveGetUrl(name) {
  const envName = GET_ENV_NAMES[name];
  const endpointPath =
    normalizePath(envName ? envValue(envName) : "") || DEFAULT_GET_PATHS[name] || "";
  if (!endpointPath) {
    throw new Error(`Unknown sync GET endpoint: ${name}`);
  }
  return resolveBaseUrl() + endpointPath;
}

module.exports = {
  buildAuthHeaders,
  getSecret,
  resolveBaseUrl,
  resolveGetUrl,
  resolvePostUrl,
  signJwt,
};
