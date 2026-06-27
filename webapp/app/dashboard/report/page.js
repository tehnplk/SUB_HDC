"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { utils, writeFileXLSX } from "xlsx";
import {
  CalendarDays,
  Download,
  FileText,
  Search,
  TableProperties,
  UploadCloud,
  X,
} from "lucide-react";
import DashboardHeaderImage from "@/components/dashboard-header-image";
import DashboardPageTitle from "@/components/dashboard-page-title";
import DashboardTabs from "@/components/dashboard-tabs";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function excelCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : value;
}

function makeReportFilename(reportName) {
  const safeName = String(reportName || "report")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${safeName || "report"}.xlsx`;
}

export default function ReportDashboard() {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({
    open: false,
    loading: false,
    error: null,
    report: null,
    columns: [],
    rows: [],
    limited: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/report", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reports");
        return res.json();
      })
      .then((payload) => setReports(payload.rows || []))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) => (
      report.name.toLowerCase().includes(term) ||
      formatDate(report.date_update).toLowerCase().includes(term) ||
      String(report.id).includes(term)
    ));
  }, [reports, searchTerm]);

  async function openReport(report) {
    setModalState({
      open: true,
      loading: true,
      error: null,
      report,
      columns: [],
      rows: [],
      limited: false,
    });

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to run report");

      setModalState({
        open: true,
        loading: false,
        error: null,
        report: payload.report,
        columns: payload.columns || [],
        rows: payload.rows || [],
        limited: Boolean(payload.limited),
      });
    } catch (err) {
      setModalState((current) => ({
        ...current,
        loading: false,
        error: err.message,
      }));
    }
  }

  function closeModal() {
    setModalState({
      open: false,
      loading: false,
      error: null,
      report: null,
      columns: [],
      rows: [],
      limited: false,
    });
  }

  function exportReport() {
    if (!modalState.columns.length || !modalState.rows.length) return;

    const rows = modalState.rows.map((row) => (
      Object.fromEntries(modalState.columns.map((column) => [column, excelCell(row[column])]))
    ));
    const worksheet = utils.json_to_sheet(rows, { header: modalState.columns });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Report");
    writeFileXLSX(workbook, makeReportFilename(modalState.report?.name));
  }

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <DashboardHeaderImage />
            <div className="titleText">
              <DashboardPageTitle />
              <p className="lead">รายการรายงานจากตาราง report</p>
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
                aria-label="ค้นหารายงาน"
                placeholder="พิมพ์ชื่อรายงาน วันที่ หรือหมายเลข"
                className="fieldInput reportSearchInput"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          {loading ? "กำลังโหลดรายงาน..." : `รายงานทั้งหมด (${filteredRows.length} รายการ)`}
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>#</th>
                <th>ชื่อรายงาน</th>
                <th style={{ width: "230px" }}>ปรับปรุงล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((report) => (
                  <tr key={report.id}>
                    <td className="fileCol">{report.id}</td>
                    <td>
                      <button
                        type="button"
                        className="reportNameButton"
                        onClick={() => openReport(report)}
                      >
                        <FileText aria-hidden="true" />
                        {report.name}
                      </button>
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarDays aria-hidden="true" />
                        {formatDate(report.date_update)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={3}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบรายงาน"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalState.open ? (
        <div className="reportModalBackdrop" role="presentation" onClick={closeModal}>
          <section
            className="reportModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reportModalHeader">
              <div>
                <h2 id="report-modal-title">{modalState.report?.name || "รายงาน"}</h2>
                <p>
                  {modalState.loading
                    ? "กำลังประมวลผลรายงาน..."
                    : `${modalState.rows.length.toLocaleString()} รายการ`}
                </p>
              </div>
              <div className="reportModalActions">
                <button
                  type="button"
                  className="reportExportButton"
                  onClick={exportReport}
                  disabled={modalState.loading || !modalState.rows.length}
                >
                  <Download aria-hidden="true" />
                  Export Excel
                </button>
                <button type="button" className="reportModalClose" onClick={closeModal} aria-label="ปิด">
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>

            {modalState.error ? <div className="error">{modalState.error}</div> : null}
            {modalState.limited ? (
              <div className="reportLimitNotice">แสดงผลสูงสุด 500 รายการแรก</div>
            ) : null}

            <div className="tableWrap reportResultWrap">
              <table className="fileTable">
                <thead>
                  <tr>
                    {modalState.columns.length ? (
                      modalState.columns.map((column) => <th key={column}>{column}</th>)
                    ) : (
                      <th>ผลลัพธ์</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {modalState.loading ? (
                    <tr>
                      <td className="emptyCell" colSpan={Math.max(modalState.columns.length, 1)}>
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : modalState.rows.length ? (
                    modalState.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {modalState.columns.map((column) => (
                          <td key={column}>{formatCell(row[column])}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="emptyCell" colSpan={Math.max(modalState.columns.length, 1)}>
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
