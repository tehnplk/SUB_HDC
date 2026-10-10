import { withDb } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_CENTER_NAME = "เมือง";

export async function GET() {
  try {
    await withDb((conn) => conn.query("SELECT 1"));
    return Response.json({ status: "online", centerName: process.env.CENTER_NAME || DEFAULT_CENTER_NAME });
  } catch {
    return Response.json({ status: "error", centerName: process.env.CENTER_NAME || DEFAULT_CENTER_NAME });
  }
}
