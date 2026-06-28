export function fileLabel(file) {
  return `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
}

export function createFileKey(file, index, timestamp = Date.now()) {
  return `${file.name}_${file.size}_${file.lastModified}_${timestamp}_${index}`;
}

export function createFileIdentity(file) {
  return `${String(file.name || "").toLowerCase()}_${file.size}_${file.lastModified}`;
}

export function summarizeImportResults(results) {
  const successCount = results.filter((result) => result.ok).length;
  const failedCount = results.length - successCount;

  if (failedCount === 0) {
    return "นำเข้าทั้งหมดเสร็จสิ้น ✓";
  }

  return `นำเข้าสำเร็จ ${successCount} ไฟล์, ล้มเหลว ${failedCount} ไฟล์`;
}
