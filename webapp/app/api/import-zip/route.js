import { access, unlink, open, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

function uploadsRoot() {
  return path.join(process.cwd(), "tmp", "uploads");
}

async function secureDelete(filePath) {
  try {
    const fileStat = await stat(filePath);
    const size = fileStat.size;
    if (size > 0) {
      const handle = await open(filePath, "r+");
      const buffer = Buffer.alloc(Math.min(size, 64 * 1024), 0);
      let written = 0;
      while (written < size) {
        const toWrite = Math.min(buffer.length, size - written);
        await handle.write(buffer, 0, toWrite, written);
        written += toWrite;
      }
      await handle.sync();
      await handle.close();
    }
  } catch (error) {
    console.error("Error during secure delete:", error);
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

function resolveUploadedPath(storedName) {
  const base = uploadsRoot();
  const resolved = path.resolve(base, storedName);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error("Invalid uploaded file reference");
  }
  return resolved;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const storedName = body?.storedName;
    const originalName = body?.originalName;

    if (typeof storedName !== "string" || !storedName) {
      return Response.json(
        { error: "storedName is required" },
        { status: 400 }
      );
    }

    if (typeof originalName !== "string" || !originalName) {
      return Response.json(
        { error: "originalName is required" },
        { status: 400 }
      );
    }

    const zipPath = resolveUploadedPath(storedName);
    await access(zipPath);

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const scriptPath = path.join(process.cwd(), "lib", "import_f43_node.js");
        const child = spawn(
          process.execPath,
          [
            scriptPath,
            "--zip",
            zipPath,
            "--file-name",
            originalName,
            "--on-duplicate",
            "replace",
            "--concurrency",
            "20",
            "--progress",
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
            ...(process.platform === "win32" && { windowsHide: true }),
          }
        );

        const closeStream = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        child.stdout.on("data", (chunk) => {
          controller.enqueue(encoder.encode(chunk.toString("utf8")));
        });

        let stderr = "";
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8");
        });

        child.on("error", (error) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({ type: "error", message: error.message })}\n`
            )
          );
          secureDelete(zipPath);
          closeStream();
        });

        child.on("close", (code) => {
          if (closed) return;
          if (code !== 0) {
            const message = stderr.trim() || `Import failed with exit code ${code}`;
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: "error", message })}\n`
              )
            );
          }
          // Delete the uploaded zip file immediately after import
          secureDelete(zipPath);
          closeStream();
        });

        request.signal.addEventListener("abort", () => {
          child.kill("SIGTERM");
          secureDelete(zipPath);
          closeStream();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Import failed" },
      { status: 500 }
    );
  }
}
