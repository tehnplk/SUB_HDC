"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileArchive,
  Play,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { createFileIdentity, createFileKey, fileLabel, summarizeImportResults } from "../lib/zip-import-client.mjs";

const MAX_FILES = 12;

function StatusIcon({ status }) {
  if (status === "uploading") return <UploadCloud aria-hidden="true" />;
  if (status === "done") return <Check aria-hidden="true" />;
  if (status === "error") return <X aria-hidden="true" />;
  if (status === "importing") return <Zap aria-hidden="true" />;
  return <FileArchive aria-hidden="true" />;
}

function statusClass(status) {
  if (status === "done") return "statusDone";
  if (status === "error") return "statusError";
  if (status === "uploading" || status === "importing") return "statusActive";
  return "statusIdle";
}

export default function ZipImporter() {
  const [entries, setEntries] = useState([]);
  const [importRunning, setImportRunning] = useState(false);
  const [globalMsg, setGlobalMsg] = useState("");

  const uploadXhrRefs = useRef({});
  const fileInputRef = useRef(null);

  function updateEntry(key, patch) {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e))
    );
  }

  function appendLog(key, line) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e;
        const next = [...(e.logLines || []), line].slice(-30);
        return { ...e, logLines: next, logOpen: true };
      })
    );
  }

  // ── Upload a single file ──
  function uploadZip(file, key) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      uploadXhrRefs.current[key] = xhr;

      xhr.open("POST", "/api/upload-zip");
      xhr.responseType = "json";

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        updateEntry(key, { uploadPercent: percent });
      };

      xhr.onload = () => {
        uploadXhrRefs.current[key] = null;
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(xhr.response?.error || "Upload failed"));
          return;
        }
        resolve(xhr.response);
      };

      xhr.onerror = () => {
        uploadXhrRefs.current[key] = null;
        reject(new Error("Upload failed"));
      };

      xhr.onabort = () => {
        uploadXhrRefs.current[key] = null;
        reject(new Error("Cancelled"));
      };

      xhr.send(formData);
    });
  }

  // ── Queue a single file for import ──
  // The webapp no longer imports in-request: it hands the ZIP to the importer
  // daemon via the directory queue and returns immediately. Live progress is
  // then followed on the log-import page (fed from log_import_file in the DB).
  async function importZip(entry) {
    const { uploadResult, key } = entry;

    updateEntry(key, { importStatus: "importing", importPercent: 0, logLines: [], logOpen: true });
    appendLog(key, `📦 ส่งเข้าคิวนำเข้า ${uploadResult.originalName}`);

    try {
      const response = await fetch("/api/import-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storedName: uploadResult.storedName,
          originalName: uploadResult.originalName,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Import failed");
      }

      appendLog(key, `⏳ เข้าคิวแล้ว (รอ ${data.pending} ไฟล์) — ดูความคืบหน้าที่หน้าประวัตินำเข้า`);
      updateEntry(key, { importStatus: "done", importPercent: 100 });
      return true;
    } catch (error) {
      updateEntry(key, { importStatus: "error", importPercent: 0 });
      appendLog(key, `❌ ${error.message}`);
      return false;
    }
  }

  // ── Handle file selection ──
  const handleFiles = useCallback((files) => {
    const remainingSlots = Math.max(0, MAX_FILES - entries.length);
    const existingIdentities = new Set(entries.map((entry) => entry.identity));
    const selectedIdentities = new Set();
    let skippedDuplicates = 0;

    const fileList = Array.from(files)
      .filter((file) => {
        const identity = createFileIdentity(file);
        if (existingIdentities.has(identity) || selectedIdentities.has(identity)) {
          skippedDuplicates += 1;
          return false;
        }
        selectedIdentities.add(identity);
        return true;
      })
      .slice(0, remainingSlots);

    if (!fileList.length) {
      if (skippedDuplicates) setGlobalMsg(`ข้ามไฟล์ซ้ำ ${skippedDuplicates} ไฟล์`);
      return;
    }

    setGlobalMsg(skippedDuplicates ? `ข้ามไฟล์ซ้ำ ${skippedDuplicates} ไฟล์` : "");
    const timestamp = Date.now();
    const newEntries = fileList.map((file, index) => {
      const key = createFileKey(file, index, timestamp);
      return {
        key,
        identity: createFileIdentity(file),
        file,
        label: fileLabel(file),
        uploadStatus: "uploading",
        uploadPercent: 0,
        uploadError: "",
        uploadResult: null,
        importStatus: "idle",
        importPercent: 0,
        logLines: [],
        logOpen: false,
      };
    });

    setEntries((prev) => [...prev, ...newEntries]);

    // Upload ทุกไฟล์พร้อมกัน แล้วส่งเข้าคิว import อัตโนมัติทันทีที่ upload เสร็จ
    // (ไม่ต้องกดปุ่ม "ส่งเข้าคิว") — importer daemon จะทยอยนำเข้าเอง
    const results = newEntries.map(async (entry) => {
      let result;
      try {
        result = await uploadZip(entry.file, entry.key);
        updateEntry(entry.key, { uploadStatus: "done", uploadPercent: 100, uploadResult: result });
      } catch (error) {
        updateEntry(entry.key, { uploadStatus: "error", uploadPercent: 0, uploadError: error.message });
        return { ok: false };
      }
      const queued = await importZip({ ...entry, uploadResult: result });
      return { ok: queued };
    });

    Promise.all(results).then((outcomes) => {
      setGlobalMsg(summarizeImportResults(outcomes));
      // เด้งไปหน้าประวัตินำเข้าเมื่อทุกไฟล์เข้าคิวสำเร็จ
      if (outcomes.length && outcomes.every((o) => o.ok)) {
        window.location.assign("/dashboard/log-import");
      }
    });
  }, [entries]);

  function handleFilePick(event) {
    const files = event.target.files;
    if (files?.length) handleFiles(files);
    event.target.value = "";
  }

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files?.length) handleFiles(files);
  }, [handleFiles]);

  // ── Parallel Import All ──
  async function handleImportAll() {
    setImportRunning(true);
    setGlobalMsg("กำลังส่งเข้าคิว...");

    const pending = entries.filter(
      (e) => e.uploadStatus === "done" && e.uploadResult && e.importStatus === "error"
    );

    try {
      const results = await Promise.all(
        pending.map(async (entry) => ({
          ok: await importZip(entry),
        }))
      );
      setGlobalMsg(summarizeImportResults(results));
      if (results.every((result) => result.ok)) {
        window.location.assign("/dashboard/log-import");
      }
    } catch (error) {
      setGlobalMsg(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setImportRunning(false);
    }
  }

  function removeEntry(key) {
    if (uploadXhrRefs.current[key]) {
      uploadXhrRefs.current[key].abort();
    }
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  function clearAll() {
    Object.values(uploadXhrRefs.current).forEach((xhr) => xhr?.abort());
    setEntries([]);
    setGlobalMsg("");
    setImportRunning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const allDone = entries.length > 0 && entries.every((e) => e.uploadStatus === "done" && e.importStatus === "done");
  // ปุ่มนี้เป็น fallback สำหรับ retry เฉพาะไฟล์ที่ upload เสร็จแต่เข้าคิวไม่สำเร็จ
  // (auto-enqueue พลาด) — ปกติ upload แล้วเข้าคิวเองไม่ต้องกด
  const canImport = entries.some(
    (e) => e.uploadStatus === "done" && e.uploadResult && e.importStatus === "error"
  );

  return (
    <div className="uploader">
      {/* ── Drop Zone ── */}
      <div
        className="dropzone"
        onDragOver={onDragOver}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          multiple
          onChange={handleFilePick}
          className="fileInput"
        />
        <div className="dropzoneInner">
          <span className="dropIcon">
            <FileArchive aria-hidden="true" />
          </span>
          <span className="dropText">
            ลากไฟล์ .zip มาวาง หรือคลิกเลือก (สูงสุด {MAX_FILES} ไฟล์)
          </span>
          <span className="dropHint">อัปโหลดแล้วส่งเข้าคิวนำเข้าอัตโนมัติ ไม่ต้องกดนำเข้า</span>
        </div>
      </div>

      {/* ── Quick actions ── */}
      {entries.length > 0 && (
        <div className="actionRow">
          {canImport && !importRunning && (
            <button type="button" className="primary" onClick={handleImportAll}>
              <Play aria-hidden="true" />
              ลองส่งเข้าคิวอีกครั้ง ({entries.filter(e => e.uploadStatus === "done" && e.importStatus === "error").length} ไฟล์)
            </button>
          )}
          {importRunning && (
            <span className="statusMsg">{globalMsg}</span>
          )}
          {allDone && (
            <span className="statusMsg statusSuccess inlineIconLabel">
              <Check aria-hidden="true" />
              ส่งเข้าคิวครบแล้ว
            </span>
          )}
          <button type="button" className="secondary" onClick={clearAll}>
            <Trash2 aria-hidden="true" />
            ล้างทั้งหมด
          </button>
        </div>
      )}

      {globalMsg && !importRunning && entries.length > 0 && !allDone && (
        <span className="statusMsg">{globalMsg}</span>
      )}

      {/* ── File list ── */}
      {entries.length > 0 && (
        <div className="fileList">
          {entries.map((entry) => (
            <div key={entry.key} className="fileCard">
              <div className="fileCardHeader">
                <span className={`fileCardIcon ${statusClass(entry.uploadStatus)}`}>
                  <StatusIcon status={entry.uploadStatus} />
                </span>
                <span className="fileCardName">{entry.label}</span>
                <button
                  type="button"
                  className="removeBtn"
                  onClick={() => removeEntry(entry.key)}
                  disabled={entry.uploadStatus === "uploading" || entry.importStatus === "importing"}
                >
                  <X aria-hidden="true" />
                </button>
              </div>

              {/* Upload progress */}
              {entry.uploadStatus === "uploading" && (
                <div className="miniProgress">
                  <div className="meter">
                    <span style={{ width: `${entry.uploadPercent}%` }} />
                  </div>
                  <span className="miniPercent">{entry.uploadPercent}%</span>
                </div>
              )}

              {entry.uploadStatus === "error" && (
                <span className="miniError">{entry.uploadError || "อัปโหลดล้มเหลว"}</span>
              )}

              {/* Import status */}
              {entry.uploadStatus === "done" && (
                <div className="importRow">
                  {entry.importStatus === "importing" && (
                    <div className="miniProgress">
                      <div className="meter">
                        <span style={{ width: `${entry.importPercent}%` }} />
                      </div>
                      <span className="miniPercent">{entry.importPercent}%</span>
                    </div>
                  )}
                  {entry.importStatus === "done" && (
                    <span className="miniDone">✓ เข้าคิวแล้ว</span>
                  )}
                  {entry.importStatus === "error" && (
                    <span className="miniError">เข้าคิวไม่สำเร็จ</span>
                  )}
                  {entry.importStatus === "idle" && (
                    <span className="miniIdle">รอนำเข้า</span>
                  )}
                </div>
              )}

              {/* Log toggle */}
              {entry.logLines?.length > 0 && (
                <div className="fileLog">
                  <button
                    type="button"
                    className="logToggle mini"
                    onClick={() => updateEntry(entry.key, { logOpen: !entry.logOpen })}
                  >
                    <span>
                      {entry.logOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                      log ({entry.logLines.length})
                    </span>
                  </button>
                  {entry.logOpen && (
                    <pre className="logBody mini">{entry.logLines.join("\n")}</pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
