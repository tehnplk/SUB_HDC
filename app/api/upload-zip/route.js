import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import AdmZip from "adm-zip";

export const runtime = "nodejs";

function safeName(name) {
  return path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
}

function assertReadableZip(buffer) {
  try {
    new AdmZip(buffer).getEntries();
  } catch {
    throw new Error("Invalid zip file");
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.name !== "string") {
      return Response.json({ error: "No zip file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return Response.json({ error: "Only .zip files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      assertReadableZip(buffer);
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "tmp", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const originalName = file.name;
    const storedName = `${randomUUID()}-${safeName(originalName)}`;
    const storedPath = path.join(uploadsDir, storedName);
    await writeFile(storedPath, buffer);

    return Response.json({
      originalName,
      storedName,
      size: file.size,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
