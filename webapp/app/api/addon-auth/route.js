import { verifyApiJwt } from "@/lib/api-auth.mjs";
import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

// ระบบภายนอกเรียก endpoint นี้เพื่อค้นว่า session-id (cid_hash) เป็นผู้ใช้คนไหน
// ป้องกันด้วย JWT HS256 (secret = JWT_KEY ใน .env) ส่งมาทาง Authorization: Bearer
// token ต้องมี claim: aud="sub-hdc-api", exp (ยังไม่หมดอายุ) — ดู lib/api-auth.mjs

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

// profile เก็บเป็น longtext JSON — คืนเป็น object; ถ้า parse ไม่ได้คืน null
function parseProfile(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function lookup(request, sessionId) {
  const token = getBearerToken(request);
  if (!(await verifyApiJwt(token))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionId) {
    return Response.json({ error: "session-id is required" }, { status: 400 });
  }

  let connection;
  try {
    connection = await createDbConnection();
    // ค้นด้วย cid_hash (ค่าที่ส่งเป็น session-id) — คืนทุก field ของผู้ใช้คนนั้น
    // พร้อมชื่อ role (role_name) และชื่อหน่วยบริการ (hospname)
    const [rows] = await connection.execute(
      `SELECT u.*, r.role AS role_name, h.hospname
       FROM c_user_provider u
       LEFT JOIN c_user_role r ON r.id = u.role
       LEFT JOIN c_hospital h ON h.hospcode = u.hoscode
       WHERE u.cid_hash = ? ORDER BY u.id LIMIT 1`,
      [sessionId],
    );
    if (!rows.length) {
      return Response.json({ found: false }, { status: 404 });
    }
    const row = rows[0];
    return Response.json({
      found: true,
      user: {
        ...row,
        is_active: Number(row.is_active) === 1,
        profile: parseProfile(row.profile),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get("session-id") || "";
  return lookup(request, sessionId);
}

export async function POST(request) {
  let sessionId = "";
  try {
    const body = await request.json();
    sessionId = String(body?.["session-id"] || body?.session_id || "");
  } catch {
    sessionId = "";
  }
  return lookup(request, sessionId);
}
