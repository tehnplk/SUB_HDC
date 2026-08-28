import { requireAppAuth } from "./auth-guard.mjs";

// โมดูล GIS: รัน dev (next dev) ไม่ต้อง login จะได้ทดสอบบนเครื่องได้เร็ว
// production (next start ในคอนเทนเนอร์) ยังบังคับ login เหมือนเดิม
export async function requireGisAuth() {
  if (process.env.NODE_ENV !== "production") return null;
  return requireAppAuth();
}
