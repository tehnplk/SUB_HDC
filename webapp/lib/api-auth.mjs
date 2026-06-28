import { requireAppAuth } from "./auth-guard.mjs";

export const AUTH_COOKIE_NAME = "sub_hdc_api_jwt";
export const API_JWT_TTL_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(encoder.encode(text));
}

function base64UrlDecodeText(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof atob === "function") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

async function getSubtleCrypto() {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API is not available");
}

function getSecret(options = {}) {
  return options.secret || process.env.JWT_KEY || "change_me";
}

function nowSeconds(options = {}) {
  return Math.floor((options.now ?? Date.now()) / 1000);
}

async function signInput(input, secret) {
  const subtle = await getSubtleCrypto();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await subtle.sign("HMAC", key, encoder.encode(input));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export function getCookieValue(header, name) {
  if (!header) return "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export async function createApiJwt(options = {}) {
  const issuedAt = nowSeconds(options);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: "sub-hdc-api",
    iat: issuedAt,
    exp: issuedAt + (options.ttlSeconds || API_JWT_TTL_SECONDS),
  };
  const body = `${base64UrlEncodeText(JSON.stringify(header))}.${base64UrlEncodeText(JSON.stringify(payload))}`;
  return `${body}.${await signInput(body, getSecret(options))}`;
}

export async function verifyApiJwt(token, options = {}) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [headerPart, payloadPart, signature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecodeText(headerPart));
    payload = JSON.parse(base64UrlDecodeText(payloadPart));
  } catch {
    return false;
  }

  if (header.alg !== "HS256" || payload.aud !== "sub-hdc-api") return false;
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSeconds(options)) return false;

  const expected = await signInput(`${headerPart}.${payloadPart}`, getSecret(options));
  return constantTimeEqual(signature, expected);
}

export async function requireApiJwt(request, options = {}) {
  if (Object.keys(options).length > 0 || process.env.AUTH_LEGACY_JWT === "1") {
    const token = getCookieValue(request.headers.get("cookie"), AUTH_COOKIE_NAME);
    if (await verifyApiJwt(token, options)) {
      return null;
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return requireAppAuth();
}

export function getApiJwtCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: API_JWT_TTL_SECONDS,
  };
}
