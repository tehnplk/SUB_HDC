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
  const importAbortRefs = useRef({});
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

  // ── Import a single file (streaming) ──
  async function importZip(entry) {
    const { uploadResult, key } = entry;
    const controller = new AbortController();
    importAbortRefs.current[key] = controller;

    updateEntry(key, { importStatus: "importing", importPercent: 0, logLines: [], logOpen: true });
    appendLog(key, `📦 เริ่มนำเข้า ${uploadResult.originalName}`);

    try {
      const response = await fetch("/api/import-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storedName: uploadResult.storedName,
          originalName: uploadResult.originalName,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Import failed");
      }

      if (!response.body) throw new Error("Stream unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleLine = (rawLine) => {
        if (!rawLine) return;
        let event;
        try { event = JSON.parse(rawLine); } catch { appendLog(key, rawLine); return; }

        if (event.type === "init") {
          appendLog(key, `📦 ${event.totalFiles} ตาราง`);
          return;
        }
        if (event.type === "queued") {
          appendLog(key, `⏳ รอคิว import (${event.active}/${event.concurrency} กำลังทำงาน, รอ ${event.pending})`);
          return;
        }
        if (event.type === "started") {
          appendLog(key, "▶️ เริ่ม import");
          return;
        }
        if (event.type === "progress") {
          updateEntry(key, { importPercent: event.percent });
          return;
        }
        if (event.type === "table") {
          const missing = event.missingColumns?.length ? ` ⚠ missing=${event.missingColumns.join(",")}` : "";
          appendLog(key, `  ✓ ${event.table}: ${event.rows} rows${missing}`);
          return;
        }
        if (event.type === "done") {
          appendLog(key, `✅ ${event.processedRows} rows / ${event.tables} tables`);
          return;
        }
        if (event.type === "error") throw new Error(event.message);
        appendLog(key, rawLine);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          handleLine(buffer.slice(0, nl).trim());
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
        }
      }
      const tail = buffer.trim();
      if (tail) handleLine(tail);

      updateEntry(key, { importStatus: "done", importPercent: 100 });
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      updateEntry(key, { importStatus: "error", importPercent: 0 });
      appendLog(key, `❌ ${error.message}`);
      return false;
    } finally {
      importAbortRefs.current[key] = null;
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

    // Upload all in parallel
    const uploads = newEntries.map(async (entry) => {
      try {
        const result = await uploadZip(entry.file, entry.key);
        updateEntry(entry.key, { uploadStatus: "done", uploadPercent: 100, uploadResult: result });
      } catch (error) {
        updateEntry(entry.key, { uploadStatus: "error", uploadPercent: 0, uploadError: error.message });
      }
    });

    Promise.allSettled(uploads).then(() => {
      setGlobalMsg((prev) => prev || "");
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
    setGlobalMsg("กำลังนำเข้าทั้งหมด...");

    const pending = entries.filter(
      (e) => e.uploadStatus === "done" && e.uploadResult && e.importStatus !== "done" && e.importStatus !== "importing"
    );

    try {
      const results = await Promise.all(
        pending.map(async (entry) => ({
          ok: await importZip(entry),
        }))
      );
      setGlobalMsg(summarizeImportResults(results));
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
    if (importAbortRefs.current[key]) {
      importAbortRefs.current[key].abort();
    }
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  function clearAll() {
    Object.values(uploadXhrRefs.current).forEach((xhr) => xhr?.abort());
    Object.values(importAbortRefs.current).forEach((ctrl) => ctrl?.abort());
    setEntries([]);
    setGlobalMsg("");
    setImportRunning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const allDone = entries.length > 0 && entries.every((e) => e.uploadStatus === "done" && e.importStatus === "done");
  const canImport = entries.some(
    (e) => e.uploadStatus === "done" && e.uploadResult && e.importStatus !== "done" && e.importStatus !== "importing"
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
          <span className="dropHint">อัปโหลดพร้อมกัน นำเข้าพร้อมกันแบบกันชนตาราง</span>
        </div>
      </div>

      {/* ── Quick actions ── */}
      {entries.length > 0 && (
        <div className="actionRow">
          {canImport && !importRunning && (
            <button type="button" className="primary" onClick={handleImportAll}>
              <Play aria-hidden="true" />
              นำเข้าทั้งหมด ({entries.filter(e => e.uploadStatus === "done" && e.importStatus !== "done").length} ไฟล์)
            </button>
          )}
          {importRunning && (
            <span className="statusMsg">{globalMsg}</span>
          )}
          {allDone && (
            <span className="statusMsg statusSuccess inlineIconLabel">
              <Check aria-hidden="true" />
              ทั้งหมดเสร็จสิ้น
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
                    <span className="miniDone">✓ นำเข้าแล้ว</span>
                  )}
                  {entry.importStatus === "error" && (
                    <span className="miniError">นำเข้าล้มเหลว</span>
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
