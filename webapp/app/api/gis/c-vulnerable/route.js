import { queryGis } from "@/lib/postgis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ประเภทกลุ่มเปราะบางที่ยังใช้งาน — ใช้สร้าง checkbox ทีละกลุ่มใน panel
// รหัสที่ยกเลิกแล้ว (is_active = 0) ไม่ขึ้นเป็นตัวเลือกให้ติ๊กใหม่
export async function GET() {
  try {
    const { rows } = await queryGis(
      `SELECT id, name, icon FROM c_vulnerable WHERE is_active = 1 ORDER BY id`
    );
    return Response.json({ items: rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
