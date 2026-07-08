const fs = require("node:fs");
const path = require("node:path");

// Directory-based import queue shared between the webapp (producer) and the
// importer daemon (consumer) through the ./webapp/tmp bind mount.
//   tmp/import/queue       ZIPs waiting to be imported
//   tmp/import/processing  ZIP currently being imported by the daemon
//   tmp/import/error/<id>  per-import files holding malformed rows

const QUEUE_NAME_RE = /^(\d+)__(.+)$/;

function importRoot(cwd = process.cwd()) {
  return path.join(cwd, "tmp", "import");
}

function queueDir(cwd) {
  return path.join(importRoot(cwd), "queue");
}

function processingDir(cwd) {
  return path.join(importRoot(cwd), "processing");
}

function errorRootDir(cwd) {
  return path.join(importRoot(cwd), "error");
}

function errorDirFor(logImportId, cwd) {
  return path.join(errorRootDir(cwd), String(logImportId));
}

function ensureImportDirs(cwd) {
  for (const dir of [queueDir(cwd), processingDir(cwd), errorRootDir(cwd)]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildQueueFileName(logImportId, storedName) {
  const id = Number(logImportId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid logImportId: ${logImportId}`);
  }
  return `${id}__${path.basename(storedName)}`;
}

function parseQueueFileName(fileName) {
  const match = QUEUE_NAME_RE.exec(fileName);
  if (!match) return { logImportId: null, baseName: fileName };
  return { logImportId: Number(match[1]), baseName: match[2] };
}

function listQueuedZips(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.toLowerCase().endsWith(".zip"))
    .map((name) => ({ name, ...parseQueueFileName(name) }))
    .sort(
      (a, b) =>
        (a.logImportId ?? Number.MAX_SAFE_INTEGER) - (b.logImportId ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name)
    );
}

function countZips(dir) {
  try {
    return fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".zip")).length;
  } catch {
    return 0;
  }
}

module.exports = {
  importRoot,
  queueDir,
  processingDir,
  errorRootDir,
  errorDirFor,
  ensureImportDirs,
  buildQueueFileName,
  parseQueueFileName,
  listQueuedZips,
  countZips,
};
