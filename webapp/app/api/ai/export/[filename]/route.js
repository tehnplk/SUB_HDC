import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAppAuth } from "../../../../../lib/auth-guard.mjs";

export const runtime = "nodejs";

function isSafeExportFilename(filename) {
  return /^[a-zA-Z0-9._% -]+\.xlsx$/i.test(filename || "") && !filename.includes("..");
}

export async function GET(_request, context) {
  const unauthorized = await requireAppAuth();
  if (unauthorized) return unauthorized;

  const params = await context.params;
  const filename = decodeURIComponent(params?.filename || "");

  if (!isSafeExportFilename(filename)) {
    return Response.json({ error: "Invalid export filename" }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "tmp", "ai-exports", filename);
    const file = await readFile(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Export file not found" }, { status: 404 });
  }
}
