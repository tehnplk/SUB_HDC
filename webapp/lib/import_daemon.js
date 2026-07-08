// Importer daemon: consumes ZIPs from the directory queue that the webapp
// upload flow produces (tmp/import/queue), runs import_f43_node.js per ZIP,
// keeps log_import_file/progress_percent updated, and secure-deletes the ZIP
// when finished. Runs as its own container (service `importer`) sharing the
// webapp image and the ./webapp/tmp bind mount.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const mysql = require("mysql2/promise");
const { loadEnvConfig } = require("@next/env");

const dirs = require("./import-dirs.js");
const { secureDelete } = require("./secure-delete.js");

loadEnvConfig(process.cwd());

const POLL_MS = Number(process.env.IMPORT_POLL_INTERVAL_MS || 3000);
const STALE_SWEEP_MS = 10 * 60 * 1000;
// A file freshly renamed into the queue is complete (rename is atomic), but a
// ZIP copied in manually can still be mid-write; leave very new files alone.
const MIN_FILE_AGE_MS = Number(process.env.IMPORT_MIN_FILE_AGE_MS || 3000);

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "sub_hdc",
    charset: "utf8mb4",
  };
}

async function withDb(callback) {
  const connection = await mysql.createConnection(getDbConfig());
  try {
    return await callback(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

function buildImportProcessArgs({ scriptPath, zipPath, originalName, logImportId, errorDir }) {
  const args = [
    scriptPath,
    "--zip",
    zipPath,
    "--file-name",
    originalName,
    "--on-duplicate",
    "replace",
    "--concurrency",
    "4",
    "--progress",
    "--log-import-id",
    String(logImportId),
  ];
  if (errorDir) {
    args.push("--error-dir", errorDir);
  }
  return args;
}

// Parses importer stdout (NDJSON progress events) and pushes percent changes
// into log_import_file.progress_percent so the dashboard can read them.
function createProgressTracker(logImportId, onPercent) {
  let buffer = "";
  let lastPercent = null;
  return (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.type === "progress") {
        const percent = Math.round(Number(event.percent));
        if (Number.isFinite(percent) && percent !== lastPercent) {
          lastPercent = percent;
          onPercent(logImportId, percent);
        }
      } else if (event.type === "table" || event.type === "table_error" || event.type === "invalid_rows" || event.type === "truncated" || event.type === "error" || event.type === "done") {
        console.log(`[import ${logImportId}] ${line}`);
      }
    }
  };
}

async function updateProgressPercent(logImportId, percent) {
  try {
    await withDb((conn) =>
      conn.execute("UPDATE `log_import_file` SET `progress_percent` = ? WHERE `id` = ?", [
        percent,
        logImportId,
      ])
    );
  } catch (error) {
    console.error(`[import ${logImportId}] progress update failed: ${error.message}`);
  }
}

// The queue file name is "<logImportId>__<storedName>.zip" when the webapp
// enqueued it. A ZIP dropped into the queue directory by hand has no id yet,
// so create the log row here to keep the log-import page consistent.
async function resolveLogImport(entry, zipPath) {
  if (entry.logImportId) {
    const row = await withDb(async (conn) => {
      const [rows] = await conn.execute(
        "SELECT `file_name` FROM `log_import_file` WHERE `id` = ?",
        [entry.logImportId]
      );
      return rows[0] || null;
    });
    if (row) {
      return { logImportId: entry.logImportId, originalName: row.file_name };
    }
  }

  const fileSize = fs.statSync(zipPath).size;
  const logImportId = await withDb(async (conn) => {
    const [result] = await conn.execute(
      "INSERT INTO `log_import_file` (`file_name`, `file_size`, `status`) VALUES (?, ?, ?)",
      [entry.baseName, fileSize, "pending"]
    );
    return result.insertId;
  });
  return { logImportId, originalName: entry.baseName };
}

async function finalizeInterrupted(logImportId, message) {
  try {
    await withDb((conn) =>
      conn.execute(
        `UPDATE \`log_import_file\`
         SET \`status\` = 'not_complate',
             \`finish_date_time\` = CURRENT_TIMESTAMP,
             \`not_complete_msg\` = ?
         WHERE \`id\` = ?
           AND \`finish_date_time\` IS NULL
           AND \`status\` IN ('pending', 'processing')`,
        [message, logImportId]
      )
    );
  } catch (error) {
    console.error(`[import ${logImportId}] finalize failed: ${error.message}`);
  }
}

async function sweepStaleImports(staleMinutes) {
  try {
    const recovered = await withDb(async (conn) => {
      const [result] = await conn.execute(
        `UPDATE \`log_import_file\`
         SET \`status\` = 'not_complate',
             \`finish_date_time\` = CURRENT_TIMESTAMP,
             \`not_complete_msg\` = 'Import interrupted: stale record recovered by cleanup'
         WHERE \`status\` IN ('pending', 'processing')
           AND \`finish_date_time\` IS NULL
           AND \`import_date_time\` < NOW() - INTERVAL ? MINUTE`,
        [staleMinutes]
      );
      return result.affectedRows;
    });
    if (recovered > 0) {
      console.log(`Recovered ${recovered} stale import record(s)`);
    }
  } catch (error) {
    console.error(`Stale sweep failed: ${error.message}`);
  }
}

// A daemon crash/restart leaves ZIPs stranded in processing/; push them back
// to the queue so they re-import (LOAD DATA REPLACE makes a rerun safe).
function recoverProcessingZips() {
  const processing = dirs.listQueuedZips(dirs.processingDir());
  for (const entry of processing) {
    const from = path.join(dirs.processingDir(), entry.name);
    const to = path.join(dirs.queueDir(), entry.name);
    try {
      fs.renameSync(from, to);
      console.log(`Recovered ${entry.name} back to queue`);
    } catch (error) {
      console.error(`Failed to recover ${entry.name}: ${error.message}`);
    }
  }
}

function runImportChild({ zipPath, originalName, logImportId, errorDir }) {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "lib", "import_f43_node.js");
    const child = spawn(
      process.execPath,
      buildImportProcessArgs({ scriptPath, zipPath, originalName, logImportId, errorDir }),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    activeChildren.add(child);

    const trackProgress = createProgressTracker(logImportId, updateProgressPercent);
    child.stdout.on("data", (chunk) => trackProgress(chunk.toString("utf8")));

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      activeChildren.delete(child);
      resolve({ code: -1, message: error.message });
    });

    child.on("close", (code) => {
      activeChildren.delete(child);
      resolve({ code, message: stderr.trim() || `Import failed with exit code ${code}` });
    });
  });
}

async function processZip(entry) {
  const queuePath = path.join(dirs.queueDir(), entry.name);
  const processingPath = path.join(dirs.processingDir(), entry.name);

  try {
    fs.renameSync(queuePath, processingPath);
  } catch (error) {
    console.error(`Failed to claim ${entry.name}: ${error.message}`);
    return;
  }

  let logImportId = entry.logImportId;
  try {
    const resolved = await resolveLogImport(entry, processingPath);
    logImportId = resolved.logImportId;

    console.log(`[import ${logImportId}] start ${resolved.originalName}`);
    const result = await runImportChild({
      zipPath: processingPath,
      originalName: resolved.originalName,
      logImportId,
      errorDir: dirs.errorDirFor(logImportId),
    });

    if (result.code === 0) {
      console.log(`[import ${logImportId}] complete`);
    } else {
      console.error(`[import ${logImportId}] failed: ${result.message}`);
      await finalizeInterrupted(logImportId, result.message);
    }
  } catch (error) {
    console.error(`[import ${logImportId ?? entry.name}] error: ${error.message}`);
    if (logImportId) {
      await finalizeInterrupted(logImportId, error.message);
    }
  } finally {
    if (logImportId) {
      await updateProgressPercent(logImportId, null);
    }
    await secureDelete(processingPath);
  }
}

function pickReadyZip() {
  const queued = dirs.listQueuedZips(dirs.queueDir());
  const now = Date.now();
  for (const entry of queued) {
    try {
      const fileStat = fs.statSync(path.join(dirs.queueDir(), entry.name));
      if (now - fileStat.mtimeMs >= MIN_FILE_AGE_MS) return entry;
    } catch {
      // File may have been claimed/removed between listing and stat.
    }
  }
  return null;
}

const activeChildren = new Set();
let running = 0;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { loadImportSettings } = await import("./import-config.mjs");
  const settings = loadImportSettings();

  dirs.ensureImportDirs();
  recoverProcessingZips();
  await sweepStaleImports(settings.staleMinutes);

  console.log(
    `import daemon started: queue=${dirs.queueDir()} poll=${POLL_MS}ms concurrency=${settings.queueConcurrency}`
  );

  let lastSweep = Date.now();
  while (!shuttingDown) {
    try {
      if (Date.now() - lastSweep >= STALE_SWEEP_MS) {
        lastSweep = Date.now();
        await sweepStaleImports(settings.staleMinutes);
      }

      while (running < settings.queueConcurrency) {
        const entry = pickReadyZip();
        if (!entry) break;
        running += 1;
        processZip(entry)
          .catch((error) => console.error(`processZip failed: ${error.message}`))
          .finally(() => {
            running -= 1;
          });
      }
    } catch (error) {
      console.error(`daemon tick failed: ${error.message}`);
    }
    await sleep(POLL_MS);
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`received ${signal}, shutting down`);
  for (const child of activeChildren) {
    child.kill("SIGTERM");
  }
  // Interrupted imports are re-queued from processing/ on the next start.
  setTimeout(() => process.exit(0), 2000).unref();
}

if (require.main === module) {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildImportProcessArgs,
  createProgressTracker,
  pickReadyZip,
};
