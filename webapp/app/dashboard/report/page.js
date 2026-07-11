"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { utils, writeFileXLSX } from "xlsx";
import {
  CalendarDays,
  Download,
  PencilLine,
  Plus,
  Search,
  TableProperties,
  UploadCloud,
  X,
} from "lucide-react";
import ModuleHeader from "@/components/module-header";
import { ImportingNotice, useImportingGuard } from "@/components/importing-guard";

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
  const importing = useImportingGuard();
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
  const [editState, setEditState] = useState({
    open: false,
    saving: false,
    error: null,
    report: null,
    name: "",
    sql: "",
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

  function openEditReport(report) {
    setEditState({
      open: true,
      saving: false,
      error: null,
      report,
      name: report.name || "",
      sql: report.sql || "",
    });
  }

  function openCreateReport() {
    setEditState({
      open: true,
      saving: false,
      error: null,
      report: null,
      name: "",
      sql: "",
    });
  }

  function closeEditReport() {
    setEditState({
      open: false,
      saving: false,
      error: null,
      report: null,
      name: "",
      sql: "",
    });
  }

  async function submitEditReport(event) {
    event.preventDefault();
    setEditState((current) => ({ ...current, saving: true, error: null }));

    try {
      const res = await fetch("/api/report", {
        method: editState.report?.id ? "PATCH" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editState.report?.id,
          name: editState.name,
          sql: editState.sql,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to save report");

      setReports((current) => current.map((report) => (
        report.id === payload.report.id ? payload.report : report
      )).concat(
        current.some((report) => report.id === payload.report.id) ? [] : [payload.report]
      ).sort((a, b) => a.id - b.id));
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Save successful",
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
      closeEditReport();
    } catch (err) {
      setEditState((current) => ({
        ...current,
        saving: false,
        error: err.message,
      }));
    }
  }

  async function deleteEditReport() {
    const id = editState.report?.id;
    if (!id) return;

    const result = await Swal.fire({
      title: "Delete report?",
      text: "This report item will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    setEditState((current) => ({ ...current, saving: true, error: null }));

    try {
      const res = await fetch("/api/report", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to delete report");

      setReports((current) => current.filter((report) => report.id !== id));
      closeEditReport();
    } catch (err) {
      setEditState((current) => ({
        ...current,
        saving: false,
        error: err.message,
      }));
    }
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
        <ModuleHeader subtitle="รายการรายงานจากตาราง report" />

        {error ? <div className="error">{error}</div> : null}

        {importing ? <ImportingNotice /> : null}

        <div className="filterGrid" hidden={importing} style={{ gridTemplateColumns: "1fr" }}>
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

        <div className="tableMeta metaLine reportGridHeader" hidden={importing}>
          <span className="metaLine">
            <TableProperties aria-hidden="true" />
            {loading ? "กำลังโหลดรายงาน..." : `รายงานทั้งหมด (${filteredRows.length} รายการ)`}
          </span>
          <button type="button" className="reportCreateButton primaryBlue" onClick={openCreateReport}>
            <Plus aria-hidden="true" />
            สร้างรายงาน
          </button>
        </div>

        <div className="tableWrap" hidden={importing}>
          <table className="fileTable">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>#</th>
                <th>ชื่อรายงาน</th>
                <th style={{ width: "230px" }}>ปรับปรุงล่าสุด</th>
                <th style={{ width: "120px" }}>Action</th>
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
                        {report.name}
                      </button>
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarDays aria-hidden="true" />
                        {formatDate(report.date_update)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="reportEditButton"
                        onClick={() => openEditReport(report)}
                      >
                        <PencilLine aria-hidden="true" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={4}>
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

      {editState.open ? (
        <div className="reportModalBackdrop" role="presentation" onClick={closeEditReport}>
          <section
            className="reportModal reportEditModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reportModalHeader">
              <div>
                <h2 id="report-edit-title">{editState.report?.id ? "Edit report" : "Create report"}</h2>
                <p>{editState.report?.id ? `ID ${editState.report.id}` : "New report"}</p>
              </div>
              <button type="button" className="reportModalClose" onClick={closeEditReport} aria-label="ปิด">
                <X aria-hidden="true" />
              </button>
            </div>

            {editState.error ? <div className="error">{editState.error}</div> : null}

            <form className="reportEditForm" onSubmit={submitEditReport}>
              <label className="reportEditField">
                <span>Name</span>
                <input
                  name="name"
                  className="reportEditInput"
                  value={editState.name}
                  onChange={(event) => setEditState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))}
                  required
                />
              </label>

              <label className="reportEditField">
                <span>SQL</span>
                <textarea
                  name="sql"
                  className="reportSqlInput"
                  value={editState.sql}
                  onChange={(event) => setEditState((current) => ({
                    ...current,
                    sql: event.target.value,
                  }))}
                  required
                  rows={10}
                />
              </label>

              <div className="reportModalActions">
                {editState.report?.id ? (
                  <button
                    type="button"
                    className="reportDeleteButton"
                    onClick={deleteEditReport}
                    disabled={editState.saving}
                  >
                    Delete
                  </button>
                ) : null}
                <div className="reportModalPrimaryActions">
                  <button type="button" className="secondary" onClick={closeEditReport} disabled={editState.saving}>
                    Cancel
                  </button>
                  <button type="submit" className="reportExportButton" disabled={editState.saving}>
                    {editState.saving ? "Saving..." : editState.report?.id ? "Save" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
