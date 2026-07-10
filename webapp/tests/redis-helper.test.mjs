import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// ทดสอบ contract ของ redis helper โดยไม่ต้องมี Redis จริง (unit)
// เน้น graceful fallback: ปิด cache แล้วต้องไม่ crash และคืน null/no-op

test("getRedis returns null when REDIS_DISABLED=1 (cache disabled)", async () => {
  const saved = process.env.REDIS_DISABLED;
  process.env.REDIS_DISABLED = "1";
  // reset global client so createClient re-runs
  delete globalThis.__subHdcRedis;
  const { getRedis, cacheGetJson, cacheSetJson, cacheDeletePattern, waitRedisReady } = await import(
    `../lib/redis.mjs?nodisable=${Date.now()}`
  );

  assert.equal(getRedis(), null);
  // helpers ต้องไม่ throw และคืนค่าปลอดภัยเมื่อไม่มี client
  assert.equal(await cacheGetJson("k"), null);
  assert.equal(await cacheSetJson("k", { a: 1 }, 60), false); // เขียนไม่ได้ต้องบอกตรงๆ
  assert.equal(await waitRedisReady(100), false); // ไม่มี client = ไม่มีวัน ready
  await cacheDeletePattern("k:*"); // no-op, must not throw

  if (saved !== undefined) process.env.REDIS_DISABLED = saved;
  else delete process.env.REDIS_DISABLED;
  delete globalThis.__subHdcRedis;
});

test("redis url is hardcoded in the lib (no .env dependency)", async () => {
  const src = await readFile(new URL("../lib/redis.mjs", import.meta.url), "utf8");
  assert.match(src, /"redis:\/\/redis:6379"/);
});

test("redis helper is configured for fail-fast fallback (no hanging on outage)", async () => {
  const src = await readFile(new URL("../lib/redis.mjs", import.meta.url), "utf8");
  // คำสั่ง cache ต้องไม่ค้างถ้า Redis ล่ม
  assert.match(src, /commandTimeout:/);
  assert.match(src, /enableOfflineQueue: false/);
  assert.match(src, /maxRetriesPerRequest:/);
});

test("compose defines redis with bounded memory and healthcheck", async () => {
  const compose = await readFile(new URL("../../docker-compose.yml", import.meta.url), "utf8");
  assert.match(compose, /\n  redis:/);
  assert.match(compose, /image:\s*redis:7-alpine/);
  assert.match(compose, /--maxmemory 128mb/);
  assert.match(compose, /--maxmemory-policy allkeys-lru/);
  // healthcheck
  assert.match(compose, /"redis-cli", "ping"/);
});
