import { createDbConnection } from "@/lib/db";
import { deleteExpiredFailedLogImports } from "@/lib/log-import.mjs";

export const runtime = "nodejs";

export async function POST() {
  let conn;
  try {
    conn = await createDbConnection();
    const deleted = await deleteExpiredFailedLogImports(conn);
    return Response.json({ deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
