import { createDbConnection } from "@/lib/db";
import { isImporting } from "@/lib/import-status.mjs";

export const runtime = "nodejs";

// endpoint เบาสำหรับหน้าที่ query ตารางใหญ่ (report, ai chat) ใช้เช็คว่ากำลัง
// นำเข้าอยู่ไหม เพื่อแสดง banner + ซ่อน content ระหว่าง import (เช็ค
// log_import_file อย่างเดียว ไม่แตะตารางใหญ่)
export async function GET() {
  let conn;
  try {
    conn = await createDbConnection();
    return Response.json({ importing: await isImporting(conn) });
  } catch (error) {
    // ถ้าเช็คไม่ได้ ให้ถือว่าไม่ import (ไม่ block การใช้งานเพราะ error ชั่วคราว)
    return Response.json({ importing: false, error: error.message });
  } finally {
    if (conn) await conn.end();
  }
}
