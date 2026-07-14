import { auth } from "@/auth";
import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

// ต่อ cid_hash เข้า query string ของ url ปลายทาง โดยใช้ชื่อพารามิเตอร์ `session-id`
function appendSessionId(url, cidHash) {
  if (!cidHash) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}session-id=${encodeURIComponent(cidHash)}`;
}

export async function GET() {
  // ผู้ใช้ที่ไม่ได้ login ก็ใช้เมนูได้ เพียงแต่ไม่ต่อ session-id ไปกับ url
  const session = await auth();

  let connection;
  try {
    connection = await createDbConnection();

    // ค่าของ session-id = cid_hash จาก c_user_provider ของผู้ใช้ ProviderID ที่ login
    // — ผู้ที่ไม่ login / บัญชี .env (ไม่มี providerId) ไม่มี
    let cidHash = "";
    const providerId = session?.user?.providerId;
    if (providerId) {
      const [rows] = await connection.execute(
        "SELECT cid_hash FROM c_user_provider WHERE provider_id = ? ORDER BY id LIMIT 1",
        [providerId],
      );
      cidHash = rows[0]?.cid_hash || "";
    }

    const [addons] = await connection.query(
      "SELECT system_name, url FROM c_addon_url WHERE is_active = 1 ORDER BY id",
    );
    const items = addons.map((row) => ({
      system_name: row.system_name,
      url: appendSessionId(row.url, cidHash),
    }));
    return Response.json({ items });
  } catch (error) {
    return Response.json({ items: [], error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
