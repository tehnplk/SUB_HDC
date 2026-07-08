"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock3,
  FileText,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import DashboardHeaderImage from "@/components/dashboard-header-image";
import DashboardPageTitle from "@/components/dashboard-page-title";
import DashboardTabs from "@/components/dashboard-tabs";

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
  const [expandedErrorId, setExpandedErrorId] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState("success");

  const loadData = useCallback((signal) => {
    setLoading(true);
    setError(null);

    return fetch("/api/dashboard?logImport=true", { signal })
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  const rows = data?.rows || [];

  useEffect(() => {
    const shouldRefresh = rows.some((row) => row.status === "processing" || row.status === "pending");
    if (!shouldRefresh) return undefined;
    const interval = setInterval(() => {
      const controller = new AbortController();
      loadData(controller.signal);
    }, 5000);
    return () => clearInterval(interval);
  }, [rows, loadData]);

  const pendingRows = useMemo(() => rows.filter((row) => ["pending", "processing"].includes(row.status)), [rows]);
  const successRows = useMemo(() => rows.filter((row) => row.status === "complete"), [rows]);
  const failedRows = useMemo(() => rows.filter((row) => ["not_complate", "no_complete"].includes(row.status)), [rows]);
  const tabRows = activeStatusTab === "pending" ? pendingRows : activeStatusTab === "success" ? successRows : failedRows;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tabRows;
    const term = searchTerm.toLowerCase();
    return tabRows.filter((row) => 
      row.file_name.toLowerCase().includes(term) ||
      String(row.id).includes(term)
    );
  }, [tabRows, searchTerm]);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <DashboardHeaderImage />
            <div className="titleText">
              <DashboardPageTitle />
              <p className="lead">ประวัติการนำเข้าไฟล์ข้อมูลและรายงานสถิติ</p>
            </div>
          </div>
          <Link href="/upload" className="navLink">
            <UploadCloud aria-hidden="true" />
            นำเข้าไฟล์
          </Link>
        </div>

        <DashboardTabs />

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
            onClick={() => setActiveStatusTab("success")}
          >
            <CircleCheck aria-hidden="true" />
            สำเร็จ({successRows.length})
          </button>
          <button
            type="button"
            className={`logImportStatusTab${activeStatusTab === "failed" ? " logImportStatusTabActive" : ""}`}
            aria-pressed={activeStatusTab === "failed"}
            onClick={() => setActiveStatusTab("failed")}
          >
            <CircleX aria-hidden="true" />
            ไม่สำเร็จ({failedRows.length})
          </button>
          <button
            type="button"
            className={`logImportStatusTab${activeStatusTab === "pending" ? " logImportStatusTabActive" : ""}`}
            aria-pressed={activeStatusTab === "pending"}
            onClick={() => setActiveStatusTab("pending")}
          >
            <Clock3 aria-hidden="true" />
            รอนำเข้า({pendingRows.length})
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
              {filteredRows.length ? (
                filteredRows.map((row) => [
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
      </section>
    </div>
  );
}
