import { getPooledDbConnection } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// หน่วยบริการในอำเภอตาม .env AMP_CODE (4 หลัก = จังหวัด2 + อำเภอ2)
export async function GET() {
  const digits = String(process.env.AMP_CODE ?? "").replace(/\D/g, "");
  if (digits.length !== 4) {
    return Response.json({ error: "AMP_CODE ต้องเป็นตัวเลข 4 หลัก" }, { status: 500 });
  }

  let conn;
  try {
    conn = await getPooledDbConnection();
    const [rows] = await conn.query(
      `SELECT hospcode, hospname_short
         FROM c_hospital
        WHERE provcode = ? AND distcode = ? AND status = '1'
        ORDER BY hospcode`,
      [digits.slice(0, 2), digits.slice(2, 4)]
    );
    return Response.json({ items: rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
