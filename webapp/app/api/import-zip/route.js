import { access, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { createDbConnection } from "../../../lib/db.js";
import { loadImportSettings } from "../../../lib/import-config.mjs";
import { createPendingLogImportFile } from "../../../lib/log-import.mjs";
import {
  buildQueueFileName,
  countZips,
  processingDir,
  queueDir,
} from "../../../lib/import-dirs.js";
import { secureDelete } from "../../../lib/secure-delete.js";

export const runtime = "nodejs";

// The webapp only accepts the upload and drops the ZIP into the directory
// queue (tmp/import/queue); the importer daemon container picks it up from
// there. No import work runs inside the webapp process anymore.

function uploadsRoot() {
  return path.join(process.cwd(), "tmp", "uploads");
}

function resolveUploadedPath(storedName) {
  const base = uploadsRoot();
  const resolved = path.resolve(base, storedName);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error("Invalid uploaded file reference");
  }
  return resolved;
}

async function createPendingLog(originalName, zipPath) {
  const connection = await createDbConnection();
  try {
    const fileStat = await stat(zipPath);
    return await createPendingLogImportFile(connection, originalName, fileStat.size);
  } finally {
    await connection.end();
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const storedName = body?.storedName;
    const originalName = body?.originalName;
    if (typeof storedName !== "string" || !storedName) {
      return Response.json({ error: "storedName is required" }, { status: 400 });
    }

    if (typeof originalName !== "string" || !originalName) {
      return Response.json({ error: "originalName is required" }, { status: 400 });
    }

    const zipPath = resolveUploadedPath(storedName);
    await access(zipPath);

    const settings = loadImportSettings();
    const active = countZips(processingDir());
    const pending = countZips(queueDir());

    if (active + pending >= settings.queueCapacity) {
      await secureDelete(zipPath);
      return Response.json(
        {
          error: "Import queue is full",
          code: "IMPORT_QUEUE_FULL",
          capacity: settings.queueCapacity,
          active,
          pending,
        },
        { status: 429 }
      );
    }

    const logImportId = await createPendingLog(originalName, zipPath);

    // rename ในไฟล์ระบบเดียวกันเป็น atomic — daemon ไม่มีทางเห็น ZIP ครึ่งไฟล์
    await mkdir(queueDir(), { recursive: true });
    const queuedPath = path.join(queueDir(), buildQueueFileName(logImportId, storedName));
    await rename(zipPath, queuedPath);

    return Response.json({
      status: "queued",
      logImportId,
      active,
      pending: pending + 1,
      capacity: settings.queueCapacity,
      concurrency: settings.queueConcurrency,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Import failed" },
      { status: 500 }
    );
  }
}
