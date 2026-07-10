import Redis from "ioredis";

// Redis client กลางใช้ร่วมทั้ง webapp และ importer เป็น cache infra ของระบบ
// (ตอนนี้ใช้กับ cache หน้า dashboard เผื่อขยายไปใช้อย่างอื่นในอนาคต)
//
// ออกแบบให้ "Redis ล่มแล้วแอปต้องไม่พัง" — ทุก helper มี graceful fallback:
// ถ้าต่อ Redis ไม่ได้/ช้า ให้คืน null (cache miss) แล้วผู้เรียกไปนับสดจาก DB แทน
// แอปจึงทำงานต่อได้เสมอ แค่ช้าลงเท่าที่ cache หายไป

const globalForRedis = globalThis;

// Redis URL hardcode ไว้ในนี้ (ไม่ต้องตั้งใน .env) — ค่า default เป็นชื่อ service
// "redis" ใน docker-compose. ตั้ง REDIS_URL ทับได้ถ้าต้องการ (เช่น dev นอก docker
// ใช้ localhost) แต่ปกติไม่ต้องแตะ. ตั้ง REDIS_DISABLED=1 เพื่อปิด cache (test)
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

function createClient() {
  if (process.env.REDIS_DISABLED === "1") return null;

  const client = new Redis(REDIS_URL, {
    // อย่าให้คำสั่ง cache ค้างนานถ้า Redis มีปัญหา — fail เร็วแล้ว fallback ไป DB
    connectTimeout: 3000,
    commandTimeout: 2000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // ไม่ queue คำสั่งตอน offline — โยน error ทันทีให้ fallback
    retryStrategy: (times) => Math.min(times * 500, 5000),
    lazyConnect: false,
  });

  // Redis ล่มไม่ควร spam log / crash process — log ครั้งเดียวพอ
  let loggedError = false;
  client.on("error", (err) => {
    if (!loggedError) {
      console.error(`Redis unavailable, falling back to direct DB queries: ${err.message}`);
      loggedError = true;
    }
  });
  client.on("ready", () => {
    loggedError = false;
  });

  return client;
}

// reuse client เดียวข้าม hot-reload (dev) และตลอด lifetime ของ process
export function getRedis() {
  if (globalForRedis.__subHdcRedis === undefined) {
    globalForRedis.__subHdcRedis = createClient();
  }
  return globalForRedis.__subHdcRedis;
}

// รอ client ต่อสำเร็จ — สำหรับ daemon ที่บูตแล้วเขียน cache ทันที: คำสั่งที่ยิง
// ระหว่าง connect ยังไม่เสร็จจะโดน enableOfflineQueue:false โยนทิ้งเงียบ (เจอจริง:
// key แรกของรอบบูต summarize หาย). คืน false ถ้าไม่ ready ใน timeout (Redis ล่ม)
// ผู้เรียกไปต่อแบบ fallback ได้. webapp route ไม่ต้องใช้ — request แรกมาช้ากว่า
// connect เสร็จเสมอ และ fail-fast สำคัญกว่า
export async function waitRedisReady(timeoutMs = 5000) {
  const client = getRedis();
  if (!client) return false;
  if (client.status === "ready") return true;
  return new Promise((resolve) => {
    const onReady = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      client.off("ready", onReady);
      resolve(false);
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
    client.once("ready", onReady);
  });
}

// อ่านค่า JSON จาก cache — คืน null ถ้า miss / Redis ล่ม / parse ไม่ได้
export async function cacheGetJson(key) {
  const client = getRedis();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// เขียนค่า JSON ลง cache พร้อม TTL (วินาที) — เงียบถ้าเขียนไม่ได้
// คืน true เมื่อเขียนสำเร็จจริง เพื่อให้ผู้เรียก (เช่น summarize) รายงานจำนวน
// key ที่ warm ได้ตรงความจริง ไม่นับรอบที่ Redis ล่ม/ปิดอยู่
export async function cacheSetJson(key, value, ttlSeconds) {
  const client = getRedis();
  if (!client) return false;
  try {
    const raw = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, raw, "EX", ttlSeconds);
    } else {
      await client.set(key, raw);
    }
    return true;
  } catch {
    // เขียน cache ไม่สำเร็จไม่ใช่เรื่องคอขวด — ปล่อยผ่าน
    return false;
  }
}

// ลบ key ตาม prefix (เช่น invalidate cache ของแฟ้มที่เพิ่ง import) — เงียบถ้าล่ม
export async function cacheDeletePattern(pattern) {
  const client = getRedis();
  if (!client) return;
  try {
    const stream = client.scanStream({ match: pattern, count: 200 });
    const keys = [];
    for await (const batch of stream) {
      keys.push(...batch);
    }
    if (keys.length) await client.del(...keys);
  } catch {
    // ลบไม่ได้ = cache เก่าจะหมดอายุตาม TTL เองอยู่แล้ว
  }
}
