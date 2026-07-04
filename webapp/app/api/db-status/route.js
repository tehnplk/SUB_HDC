import { createDbConnection } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_CENTER_NAME = "\u0e40\u0e21\u0e37\u0e2d\u0e07";

export async function GET() {
  let conn;
  try {
    conn = await createDbConnection();
    await conn.query("SELECT 1");
    return Response.json({ status: "online", centerName: process.env.CENTER_NAME || DEFAULT_CENTER_NAME });
  } catch {
    return Response.json({ status: "error", centerName: process.env.CENTER_NAME || DEFAULT_CENTER_NAME });
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}
