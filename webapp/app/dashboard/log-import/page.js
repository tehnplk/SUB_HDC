"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  FileText,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import ModuleHeader from "@/components/module-header";

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return isoString;
  }
}

function formatDurationSeconds(importDateTime, finishDateTime) {
  if (!importDateTime || !finishDateTime) return "-";
  const startMs = new Date(importDateTime).getTime();
  const finishMs = new Date(finishDateTime).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(finishMs) || finishMs < startMs) return "-";
  return `${Math.round((finishMs - startMs) / 1000)} วินาที`;
}

function formatFileSize(fileSize) {
  if (fileSize == null || fileSize === "") return "-";
  const bytes = Number(fileSize);
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes.toLocaleString("th-TH")} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

// A completed import that skipped malformed rows still has a not_complete_msg:
// treat it as "success with warning" rather than a plain success or a failure.
function hasWarning(row) {
  return row.status === "complete" && Boolean(row.not_complete_msg);
}

function statusBadgeClass(row) {
  const classes = ["importStatusBadge"];
  if (row.status === "complete") classes.push(hasWarning(row) ? "isWarning" : "isComplete");
  if (row.status === "pending") classes.push("isPending");
  if (row.status === "processing") classes.push("isProcessing");
  if (row.status === "not_complate" || row.status === "no_complete") classes.push("isNotComplete");
  return classes.join(" ");
}

function statusBadgeLabel(row) {
  if (row.status === "pending") return "รอนำเข้า";
  if (row.status === "processing") {
    if (Number.isFinite(row.progress_percent)) return `กำลังนำเข้า ${Math.round(row.progress_percent)}%`;
    return "กำลังนำเข้า";
  }
  if (row.status === "complete") return "สำเร็จ";
  if (row.status === "not_complate" || row.status === "no_complete") return "ไม่สำเร็จ";
  return row.status || "-";
}

export default function LogImportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // ค้นหาแบบ debounce — พิมพ์หยุด 400ms ค่อยยิง fetch (server-side filter)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedErrorId, setExpandedErrorId] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState("success");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Lazy-load ทีละหน้าจาก server (20 แถว/หน้า) — tab/คำค้น/เลขหน้าอยู่ใน query
  const loadData = useCallback((signal) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ logImport: "true", page: String(page), status: activeStatusTab });
    if (debouncedSearch) params.set("q", debouncedSearch);

    return fetch(`/api/dashboard?${params}`, { signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load log import data");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [page, activeStatusTab, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  const rows = data?.rows || [];
  const counts = data?.counts || { success: 0, failed: 0, pending: 0 };
  const total = Number(data?.total || 0);
  const pageSize = Number(data?.pageSize || 20);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!(counts.pending > 0)) return undefined;
    const interval = setInterval(() => {
      const controller = new AbortController();
      loadData(controller.signal);
    }, 5000);
    return () => clearInterval(interval);
  }, [counts.pending, loadData]);

  function switchTab(tab) {
    setActiveStatusTab(tab);
    setPage(1);
  }

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ประวัติการนำเข้าไฟล์ข้อมูลและรายงานสถิติ" />

        {error ? <div className="error">{error}</div> : null}

        <div className="filterGrid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field">
            <div className="inputWithIcon">
              <Search aria-hidden="true" />
              <input
                type="text"
                aria-label="ค้นด้วยรหัส 5 หลัก / ชื่อไฟล์ / ไอดีนำเข้า"
                placeholder="ค้นด้วยรหัส 5 หลัก"
                className="fieldInput"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-sm)",
                  background: "#ffffff",
                  color: "var(--foreground)",
                  font: "inherit",
                  fontSize: "15px",
                  fontWeight: "650",
                  padding: "0 40px 0 12px",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.boxShadow = "0 0 0 4px var(--accent-glow)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-strong)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="inputClearBtn"
                  aria-label="ล้างตัวกรอง"
                  onClick={() => setSearchTerm("")}
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="logImportStatusTabs" role="group" aria-label="log import status">
          <button
            type="button"
            className={`logImportStatusTab${activeStatusTab === "success" ? " logImportStatusTabActive" : ""}`}
            aria-pressed={activeStatusTab === "success"}
            onClick={() => switchTab("success")}
          >
            <CircleCheck aria-hidden="true" />
            สำเร็จ({counts.success})
          </button>
          <button
            type="button"
            className={`logImportStatusTab${activeStatusTab === "failed" ? " logImportStatusTabActive" : ""}`}
            aria-pressed={activeStatusTab === "failed"}
            onClick={() => switchTab("failed")}
          >
            <CircleX aria-hidden="true" />
            ไม่สำเร็จ({counts.failed})
          </button>
          <button
            type="button"
            className={`logImportStatusTab${activeStatusTab === "pending" ? " logImportStatusTabActive" : ""}`}
            aria-pressed={activeStatusTab === "pending"}
            onClick={() => switchTab("pending")}
          >
            <Clock3 aria-hidden="true" />
            รอนำเข้า({counts.pending})
          </button>
        </div>

        <div className="tableWrap">
          <table className="fileTable logImportTable">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>#</th>
                <th>ไฟล์</th>
                <th style={{ width: "110px" }}>Size</th>
                <th style={{ width: "250px" }}>วันที่-เวลานำเข้า</th>
                <th style={{ width: "150px" }}>status</th>
                <th style={{ width: "250px" }}>finish_date_time</th>
                <th style={{ width: "110px" }}>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => [
                  <tr key={`row-${row.id}`}>
                    <td className="fileCol" style={{ color: "var(--accent-strong)" }}>{row.id}</td>
                    <td className="logImportFileCell">
                      <span className="tableCellIcon">
                        <FileText aria-hidden="true" />
                        {row.file_name}
                      </span>
                    </td>
                    <td>{formatFileSize(row.file_size)}</td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarClock aria-hidden="true" />
                        {formatDateTime(row.import_date_time)}
                      </span>
                    </td>
                    <td>
                      {row.status === "not_complate" || hasWarning(row) ? (
                        <button
                          type="button"
                          className={`${statusBadgeClass(row)} isClickable`}
                          onClick={() => setExpandedErrorId((current) => (current === row.id ? null : row.id))}
                        >
                          {statusBadgeLabel(row)}
                          {hasWarning(row) ? <AlertTriangle aria-hidden="true" /> : null}
                        </button>
                      ) : (
                        <span className={statusBadgeClass(row)}>
                          {statusBadgeLabel(row)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarClock aria-hidden="true" />
                        {formatDateTime(row.finish_date_time)}
                      </span>
                    </td>
                    <td>{formatDurationSeconds(row.import_date_time, row.finish_date_time)}</td>
                  </tr>,
                  expandedErrorId === row.id && (row.status === "not_complate" || hasWarning(row)) ? (
                    <tr key={`msg-${row.id}`} className={`notCompleteMessageRow${hasWarning(row) ? " isWarningRow" : ""}`}>
                      <td colSpan={7}>
                        <div className="notCompleteMessage">{row.not_complete_msg || "-"}</div>
                      </td>
                    </tr>
                  ) : null,
                ])
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={7}>
                    {loading ? "กำลังโหลดข้อมูล..." : activeStatusTab === "pending" ? "ไม่มีไฟล์รอนำเข้า" : "ไม่พบประวัติการนำเข้า"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize ? (
          <div className="pagination">
            <button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
              <ChevronLeft aria-hidden="true" />
              ก่อน
            </button>
            <span>
              หน้า {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>
              ถัดไป
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
