import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

// GET  = อ่านยอดปัจจุบัน (ไม่เพิ่ม)
// POST = เพิ่มหนึ่งครั้งแล้วคืนยอดใหม่ (นับต่อการโหลดหน้าเต็มหนึ่งครั้ง)
// endpoint สาธารณะ — นับได้ก่อน login

async function readTotal(conn) {
  const [[row]] = await conn.query("SELECT `total` FROM `visit_counter` WHERE `id` = 1");
  return Number(row?.total || 0);
}

export async function GET() {
  let conn;
  try {
    conn = await createDbConnection();
    return Response.json({ total: await readTotal(conn) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}

export async function POST() {
  let conn;
  try {
    conn = await createDbConnection();
    await conn.query(
      "INSERT INTO `visit_counter` (`id`, `total`) VALUES (1, 1) ON DUPLICATE KEY UPDATE `total` = `total` + 1"
    );
    return Response.json({ total: await readTotal(conn) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
