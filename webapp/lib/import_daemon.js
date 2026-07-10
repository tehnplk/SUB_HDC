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
// Watchdog: last resort กัน worker แขวน (LOAD DATA ค้างเพราะ half-open TCP)
// ขวางคิวตลอดกาล. ต้องยาวกว่า import จริงที่ช้าที่สุด — my.cnf ตั้ง
// net_read_timeout 3600s เผื่อ charge_opd 2.4M แถวบนเครื่อง disk-bound
// (chronicfu 365k แถวเคยใช้ ~619s) ดังนั้น 2 ชม. คือเพดานที่ไม่ฆ่างานดี
// แต่ยังปลดคิวได้ถ้าทุก layer ล่าง (net timeout ฝั่ง DB) พลาดหมด
const IMPORT_CHILD_TIMEOUT_MS = Number(process.env.IMPORT_CHILD_TIMEOUT_MS || 2 * 60 * 60 * 1000);
// Retry cap: คิวเป็น file-based (pickReadyZip อ่านโฟลเดอร์ ไม่เช็คสถานะ DB)
// และ requeue reset import_date_time ทุกรอบ — stale sweep จึงหยุด loop ไม่ได้
// ต้อง cap จำนวน requeue เอง. นับใน memory (daemon restart = นับใหม่ ซึ่งรับได้
// เพราะ restart เป็นการตัดสินใจของคน). เกิน cap → ปิดจ๊อบ + ลบไฟล์ พร้อม
// ข้อความบอกให้ re-upload — ดีกว่าวนกินคิวไม่รู้จบ
const IMPORT_MAX_REQUEUES = Number(process.env.IMPORT_MAX_REQUEUES || 3);
const requeueAttempts = new Map();
// id ของ import ที่ worker กำลังทำอยู่ — sweep ต้องไม่แตะ row เหล่านี้
// (จำเป็นสำหรับไฟล์หย่อนมือที่กำลัง process: ไฟล์ใน processing/ ไม่มี prefix id
// จึงหาไม่เจอจากชื่อไฟล์ ต้องรู้จาก set นี้แทน)
const activeImportIds = new Set();
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

// worker exit 1 ทั้งกรณีข้อมูลเสีย (retry ไปก็ fail ซ้ำ) และกรณีเครือข่ายล่ม
// ชั่วคราว (retry แล้วรอด) — แยกจากข้อความ error: ลายเซ็น error ระดับ
// connection/socket = transient ควร re-queue ไม่ใช่ลบไฟล์ทิ้ง
const TRANSIENT_FAILURE_RE = /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|EHOSTUNREACH|ENETUNREACH|PROTOCOL_CONNECTION_LOST|connection is in closed state|server closed the connection|ER_NET_READ_TIMEOUT|ER_NET_WRITE_TIMEOUT/i;

function isTransientImportFailure(message) {
  return TRANSIENT_FAILURE_RE.test(String(message || ""));
}

// รีเซ็ต log row กลับเป็น pending เมื่อคืน ZIP เข้า queue เพื่อ re-import
// (import_date_time = NOW() เพื่อให้ stale sweep นับเวลาใหม่จากรอบ retry นี้
// ไม่ใช่เวลา upload เดิม ที่อาจเก่าจนโดน sweep ทันที)
async function requeueLogImport(logImportId) {
  await withDb((conn) =>
    conn.execute(
      `UPDATE \`log_import_file\`
       SET \`status\` = 'pending',
           \`import_date_time\` = CURRENT_TIMESTAMP,
           \`finish_date_time\` = NULL,
           \`progress_percent\` = NULL
       WHERE \`id\` = ?`,
      [logImportId]
    )
  );
}

// id ทั้งหมดที่ยังมีไฟล์รออยู่จริงใน queue/ หรือ processing/ — row ของ id
// เหล่านี้ไม่ใช่ row กำพร้า ห้าม sweep ไม่ว่าจะรอมานานแค่ไหน (batch ใหญ่
// ที่ อ.เมือง รอคิวเกิน 2 ชม. เป็นเรื่องปกติ — วัดจริง 2026-07-09)
function collectQueuedImportIds() {
  const ids = new Set();
  for (const dir of [dirs.queueDir(), dirs.processingDir()]) {
    for (const entry of dirs.listQueuedZips(dir)) {
      if (entry.logImportId) ids.add(entry.logImportId);
    }
  }
  return ids;
}

// เก็บ row กำพร้า: ค้าง pending/processing โดย "ไม่มีไฟล์ในคิวและไม่มี worker
// กำลังทำ" — เกณฑ์ชี้ขาดคือไฟล์หาย ไม่ใช่เวลา (เวลาเป็นแค่ minimum age กัน
// race ตอนไฟล์เพิ่งถูกสร้าง) จึงตั้ง staleMinutes สั้นได้โดยไม่โดนงานจริง
async function sweepStaleImports(staleMinutes) {
  try {
    const recovered = await withDb(async (conn) => {
      const [rows] = await conn.execute(
        `SELECT \`id\` FROM \`log_import_file\`
         WHERE \`status\` IN ('pending', 'processing')
           AND \`finish_date_time\` IS NULL
           AND \`import_date_time\` < NOW() - INTERVAL ? MINUTE`,
        [staleMinutes]
      );
      if (!rows.length) return 0;

      const queuedIds = collectQueuedImportIds();
      const orphanIds = rows
        .map((row) => Number(row.id))
        .filter((id) => !activeImportIds.has(id) && !queuedIds.has(id));
      if (!orphanIds.length) return 0;

      const [result] = await conn.execute(
        `UPDATE \`log_import_file\`
         SET \`status\` = 'not_complate',
             \`finish_date_time\` = CURRENT_TIMESTAMP,
             \`not_complete_msg\` = 'Import interrupted: no queue file found, recovered by cleanup'
         WHERE \`id\` IN (${orphanIds.map(() => "?").join(", ")})
           AND \`status\` IN ('pending', 'processing')`,
        orphanIds
      );
      return result.affectedRows;
    });
    if (recovered > 0) {
      console.log(`Recovered ${recovered} orphaned import record(s)`);
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

    // Watchdog: worker แขวนเกินเวลา → kill แล้วรายงาน fail เพื่อกันคิวตัน.
    // ใช้ SIGKILL (ไม่ใช่ SIGTERM) เพราะ process ที่ค้างที่ syscall (ep_poll)
    // อาจไม่ตอบ SIGTERM. close handler จะ resolve ให้เอง
    let timedOut = false;
    const watchdog = setTimeout(() => {
      timedOut = true;
      console.error(`[import ${logImportId}] watchdog: killing hung worker after ${IMPORT_CHILD_TIMEOUT_MS}ms`);
      child.kill("SIGKILL");
    }, IMPORT_CHILD_TIMEOUT_MS);
    watchdog.unref();

    child.on("error", (error) => {
      clearTimeout(watchdog);
      activeChildren.delete(child);
      resolve({ code: -1, message: error.message });
    });

    child.on("close", (code, signal) => {
      clearTimeout(watchdog);
      activeChildren.delete(child);
      // ตายเพราะ signal (watchdog SIGKILL / docker restart ส่ง SIGTERM) → code
      // เป็น null ไม่ใช่ตัวเลข ต้องนับเป็น interrupted — ไม่งั้นตกไป path
      // "fail จริง" แล้วลบ ZIP ทิ้ง (นี่คือสาเหตุแท้ที่ข้อมูล job 330 หาย:
      // log บันทึกไว้ว่า "Import failed with exit code null")
      const interrupted = timedOut || signal !== null || code === null;
      const message = timedOut
        ? `Import timed out and was killed after ${IMPORT_CHILD_TIMEOUT_MS}ms`
        : signal
          ? `Import killed by ${signal}`
          : stderr.trim() || `Import failed with exit code ${code}`;
      resolve({ code: interrupted ? -1 : code, message });
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
  // ZIP ควรถูก secure-delete เฉพาะเมื่อ import จบ (สำเร็จ หรือ fail จริงจาก
  // ข้อมูล/ไฟล์เสีย ที่ retry ไปก็ fail ซ้ำ). ถ้า fail แบบ interrupted
  // (worker ถูก kill / timeout / network drop — code -1) อย่าลบ ให้คืน ZIP
  // กลับ queue เพื่อ re-import (LOAD DATA REPLACE ทำให้รันซ้ำปลอดภัย) มิฉะนั้น
  // ข้อมูลไฟล์นั้นตกหล่นเงียบ ๆ อย่างที่เจอกับ job ที่แขวนแล้วโดน restart
  let requeueOnExit = false;
  // ไฟล์หย่อนมือไม่มี prefix "id__" — ตอน requeue ต้องเปลี่ยนชื่อให้มี id ไม่งั้น
  // รอบ retry จะสร้าง log row ใหม่ทุกครั้ง ทิ้ง row เดิมค้าง pending (block
  // isImporting จนกว่า stale sweep เก็บ). ชื่อนี้เป็น key นับ cap ด้วย —
  // รอบ retry ถัดไป entry.name จะเท่ากับชื่อนี้ ตัวนับจึงต่อเนื่อง
  let requeueName = entry.name;

  // นับ attempt + ตัดสินว่า requeue ต่อหรือยอมแพ้ (ใช้ทั้ง path ปกติและ path
  // ที่ resolveLogImport พังเพราะ DB ล่มชั่วคราว)
  const trackRequeue = async (message) => {
    const attempts = (requeueAttempts.get(requeueName) || 0) + 1;
    if (attempts > IMPORT_MAX_REQUEUES) {
      requeueAttempts.delete(requeueName);
      console.error(`[import ${logImportId ?? entry.name}] giving up after ${IMPORT_MAX_REQUEUES} retries: ${message}`);
      if (logImportId) {
        await finalizeInterrupted(
          logImportId,
          `Interrupted ${IMPORT_MAX_REQUEUES + 1} times, giving up — re-upload required (last: ${message})`
        );
      }
      return;
    }
    requeueAttempts.set(requeueName, attempts);
    console.error(
      `[import ${logImportId ?? entry.name}] interrupted (attempt ${attempts}/${IMPORT_MAX_REQUEUES}), will re-queue: ${message}`
    );
    requeueOnExit = true;
  };

  try {
    const resolved = await resolveLogImport(entry, processingPath);
    logImportId = resolved.logImportId;
    activeImportIds.add(logImportId);
    if (!entry.logImportId && logImportId) {
      requeueName = dirs.buildQueueFileName(logImportId, entry.baseName);
    }

    console.log(`[import ${logImportId}] start ${resolved.originalName}`);
    const result = await runImportChild({
      zipPath: processingPath,
      originalName: resolved.originalName,
      logImportId,
      errorDir: dirs.errorDirFor(logImportId),
    });

    if (result.code === 0) {
      requeueAttempts.delete(requeueName);
      console.log(`[import ${logImportId}] complete`);
    } else if (result.code === -1 || isTransientImportFailure(result.message)) {
      // interrupted (timeout / signal kill / spawn error) หรือ error เครือข่าย
      // — transient ให้ retry แต่ต้อง cap: คิวเป็น file-based, stale sweep
      // หยุด loop ไฟล์ไม่ได้
      await trackRequeue(result.message);
    } else {
      // import fail จริง (ข้อมูล/ไฟล์เสีย) — retry ไปก็ fail ซ้ำ ปิดจ๊อบ
      console.error(`[import ${logImportId}] failed: ${result.message}`);
      await finalizeInterrupted(logImportId, result.message);
    }
  } catch (error) {
    console.error(`[import ${logImportId ?? entry.name}] error: ${error.message}`);
    if (isTransientImportFailure(error.message)) {
      // DB ล่มชั่วคราวตอน resolve/update (network เคสเดียวกับที่ import พัง)
      // — ห้ามตกไป path ลบไฟล์ ให้ retry เหมือน interrupted
      await trackRequeue(error.message);
    } else if (logImportId) {
      await finalizeInterrupted(logImportId, error.message);
    }
  } finally {
    if (logImportId) activeImportIds.delete(logImportId);
    if (requeueOnExit) {
      // คืน ZIP กลับ queue แทนลบ (จำนวนรอบถูก cap ด้วย IMPORT_MAX_REQUEUES แล้ว)
      try {
        fs.renameSync(processingPath, path.join(dirs.queueDir(), requeueName));
      } catch (error) {
        // rename ไม่ได้ = ไฟล์กู้ไม่ได้จริง ๆ — ปิดจ๊อบแบบ fail แทนปล่อยค้าง
        console.error(`[import ${logImportId ?? entry.name}] re-queue failed: ${error.message}`);
        await secureDelete(processingPath).catch(() => {});
        if (logImportId) await finalizeInterrupted(logImportId, `re-queue failed: ${error.message}`);
        return;
      }
      // reset row เป็น pending แยกจาก rename — ถ้า DB ล่มชั่วคราว (network เคส
      // เดียวกับที่ทำให้ interrupted) ไฟล์ต้องยังอยู่ใน queue; worker รอบ retry
      // จะตั้ง processing/complete ให้เองเมื่อ DB กลับมา
      if (logImportId) {
        await requeueLogImport(logImportId).catch((error) =>
          console.error(`[import ${logImportId}] requeue status update failed: ${error.message}`)
        );
      }
      console.log(`[import ${logImportId ?? entry.name}] re-queued for retry`);
      return;
    }
    if (logImportId) {
      await updateProgressPercent(logImportId, null);
    }
    await secureDelete(processingPath);
  }
}

// เลือก "ไฟล์เล็กสุด" ก่อน ไม่ใช่ FIFO: ไฟล์ รพ.สต. (< 1MB ใช้ไม่กี่วินาที)
// ไม่ควรรอไฟล์ รพ.ใหญ่ (16–33MB ใช้จริง 20–33 นาที — วัดจาก อ.เมือง) ที่บังเอิญ
// มาก่อน. ไฟล์ใหญ่เริ่มเมื่อไม่มีตัวเล็กรอ แล้วรันรวดจนจบ — ไม่ preempt กลางคัน
// จึงไม่เสียงานทิ้งและไม่มี loop. ขนาดเท่ากันได้ลำดับ upload เดิม (listQueuedZips
// เรียงตาม logImportId มาแล้ว และใช้ < เคร่งครัดจึงคงตัวแรกไว้)
function pickReadyZip() {
  const queued = dirs.listQueuedZips(dirs.queueDir());
  const now = Date.now();
  let smallest = null;
  let smallestSize = Infinity;
  for (const entry of queued) {
    try {
      const fileStat = fs.statSync(path.join(dirs.queueDir(), entry.name));
      if (now - fileStat.mtimeMs < MIN_FILE_AGE_MS) continue;
      if (fileStat.size < smallestSize) {
        smallest = entry;
        smallestSize = fileStat.size;
      }
    } catch {
      // File may have been claimed/removed between listing and stat.
    }
  }
  return smallest;
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
  isTransientImportFailure,
  pickReadyZip,
};
