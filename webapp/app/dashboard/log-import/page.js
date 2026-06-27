"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FileText,
  History,
  Search,
  TableProperties,
  UploadCloud,
} from "lucide-react";
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

export default function LogImportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/dashboard?logImport=true", { signal: controller.signal })
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

    return () => controller.abort();
  }, []);

  const rows = data?.rows || [];

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) => 
      row.file_name.toLowerCase().includes(term) ||
      String(row.id).includes(term)
    );
  }, [rows, searchTerm]);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <span className="iconBadge">
              <History aria-hidden="true" />
            </span>
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
                aria-label="ค้นหาตามชื่อไฟล์ / ไอดีนำเข้า"
                placeholder="พิมพ์ชื่อไฟล์ ไอดีนำเข้า"
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
                  padding: "0 12px",
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
            </div>
          </div>
        </div>

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          {loading ? "กำลังโหลด..." : `รายการประวัติการนำเข้าทั้งหมด (${filteredRows.length} รายการ)`}
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th style={{ width: "120px" }}>#</th>
                <th>ชื่อไฟล์ที่นำเข้า</th>
                <th style={{ width: "250px" }}>วันที่-เวลานำเข้า</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="fileCol" style={{ color: "var(--accent-strong)" }}>{row.id}</td>
                    <td style={{ wordBreak: "break-all" }}>
                      <span className="tableCellIcon">
                        <FileText aria-hidden="true" />
                        {row.file_name}
                      </span>
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarClock aria-hidden="true" />
                        {formatDateTime(row.import_date_time)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={3}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบประวัติการนำเข้า"}
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
