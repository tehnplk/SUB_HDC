import { withDb } from "@/lib/db";
import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis.mjs";
import { requireAccess } from "@/lib/access.mjs";

export const runtime = "nodejs";
const VISIT_WINDOW_SECONDS = 30 * 60;

// GET  = อ่านยอดปัจจุบัน (ไม่เพิ่ม)
// POST = เพิ่มหนึ่งครั้งแล้วคืนยอดใหม่ (นับต่อการโหลดหน้าเต็มหนึ่งครั้ง)
// endpoint สาธารณะ — นับได้ก่อน login

async function readTotal(conn) {
  const [[row]] = await conn.query("SELECT `total` FROM `visit_counter` WHERE `id` = 1");
  return Number(row?.total || 0);
}

function visitorKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const address = (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown").trim();
  return `visit-counter:${createHash("sha256").update(address).digest("hex")}`;
}

async function mayCountVisit(request) {
  const redis = getRedis();
  if (!redis) return true;

  try {
    const allowed = await redis.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count == 1 and 1 or 0",
      1,
      visitorKey(request),
      VISIT_WINDOW_SECONDS,
    );
    return allowed === 1;
  } catch {
    return true;
  }
}

export async function GET() {
  try {
    return Response.json({ total: await withDb(readTotal) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  try {
    return await withDb(async (conn) => {
      const counted = await mayCountVisit(request);
      if (counted) {
        await conn.query(
          "INSERT INTO `visit_counter` (`id`, `total`) VALUES (1, 1) ON DUPLICATE KEY UPDATE `total` = `total` + 1"
        );
      }
      return Response.json({ total: await readTotal(conn), counted });
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
