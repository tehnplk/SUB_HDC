const globalForImportProgress = globalThis;

const progressMap =
  globalForImportProgress.__subHdcImportProgress ||
  new Map();

globalForImportProgress.__subHdcImportProgress = progressMap;

function normalizeLogImportId(logImportId) {
  const id = Number(logImportId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePercent(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value);
}

export function getImportProgressPercent(logImportId) {
  const id = normalizeLogImportId(logImportId);
  if (!id || !progressMap.has(id)) return null;
  return progressMap.get(id);
}

export function clearImportProgress(logImportId) {
  const id = normalizeLogImportId(logImportId);
  if (!id) return;
  progressMap.delete(id);
}

export function updateImportProgressFromEvent(logImportId, event) {
  const id = normalizeLogImportId(logImportId);
  if (!id || !event || typeof event !== "object") return;

  if (event.type === "done" || event.type === "error") {
    clearImportProgress(id);
    return;
  }

  if (event.type !== "progress") return;
  const percent = normalizePercent(event.percent);
  if (percent === null) return;
  progressMap.set(id, percent);
}
