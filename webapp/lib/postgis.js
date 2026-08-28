import pg from "pg";

// PostGIS ของโมดูล GIS — คนละ instance กับ MariaDB ที่เก็บแฟ้มดิบ/ตารางสรุป
export function getGisDbConfig() {
  const port = Number(process.env.GIS_DB_PORT || 5432);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("GIS_DB_PORT must be a valid port number");
  }

  return {
    host: process.env.GIS_DB_HOST || "localhost",
    port,
    user: process.env.GIS_DB_USER || "postgres",
    password: process.env.GIS_DB_PASSWORD || "",
    database: process.env.GIS_DB_DATABASE || "sub_hdc_gis",
  };
}

// Pool ร่วมแบบเดียวกับ getDbPool ของ MariaDB — เก็บบน globalThis ให้ dev hot
// reload ใช้ pool เดิม ไม่รั่ว pool ใหม่ทุกครั้งที่ reload. cache ผูกกับ config
// ด้วย ไม่งั้นแก้ env แล้ว pool เดิมยังต่อ host เก่าค้างจนกว่าจะ restart
export function getGisDbPool() {
  const config = getGisDbConfig();
  const key = `${config.host}:${config.port}/${config.database}/${config.user}`;
  const cached = globalThis.__subHdcGisDbPool;
  if (cached?.key === key) return cached.pool;

  if (cached?.pool) cached.pool.end().catch(() => {});
  const pool = new pg.Pool({ ...config, max: 5, idleTimeoutMillis: 30000 });
  globalThis.__subHdcGisDbPool = { key, pool };
  return pool;
}

export function queryGis(text, params) {
  return getGisDbPool().query(text, params);
}

// รหัสอำเภอของ boundary เป็นรูปแบบ TH + รหัสอำเภอ 4 หลัก (เช่น 6501 -> TH6501)
export function districtBoundaryCode(ampCode = process.env.AMP_CODE) {
  const digits = String(ampCode ?? "").replace(/\D/g, "");
  return digits ? `TH${digits}` : "";
}
