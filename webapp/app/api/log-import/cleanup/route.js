import { withDb } from "@/lib/db";
import { deleteExpiredFailed } from "@/lib/log-import-file.js";
import { requireAccess } from "@/lib/access.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  try {
    const deleted = await withDb((conn) => deleteExpiredFailed(conn));
    return Response.json({ deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
