"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Search,
  TableProperties,
  Tags,
  UploadCloud,
} from "lucide-react";
import DashboardPageTitle from "@/components/dashboard-page-title";
import DashboardTabs from "@/components/dashboard-tabs";

const REPORT_ROWS = [
  { id: 1, name: "รายงานจำนวนประชากรแยกตามหน่วยบริการ", type: "ทะเบียน", date: "27 มิ.ย. 2569" },
  { id: 2, name: "รายงานการรับบริการผู้ป่วยนอก", type: "บริการ", date: "27 มิ.ย. 2569" },
  { id: 3, name: "รายงานการรับบริการผู้ป่วยใน", type: "บริการ", date: "26 มิ.ย. 2569" },
  { id: 4, name: "รายงานการตรวจคัดกรองโรคเรื้อรัง", type: "คัดกรอง", date: "26 มิ.ย. 2569" },
  { id: 5, name: "รายงานการฝากครรภ์", type: "ส่งเสริมสุขภาพ", date: "25 มิ.ย. 2569" },
  { id: 6, name: "รายงานวัคซีนและการสร้างเสริมภูมิคุ้มกัน", type: "ส่งเสริมสุขภาพ", date: "25 มิ.ย. 2569" },
  { id: 7, name: "รายงานทันตกรรม", type: "บริการ", date: "24 มิ.ย. 2569" },
  { id: 8, name: "รายงานการจ่ายยา", type: "ยา", date: "24 มิ.ย. 2569" },
  { id: 9, name: "รายงานการส่งต่อ", type: "ส่งต่อ", date: "23 มิ.ย. 2569" },
  { id: 10, name: "รายงานคุณภาพข้อมูลสะสม", type: "คุณภาพข้อมูล", date: "23 มิ.ย. 2569" },
];

export default function ReportDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredRows = REPORT_ROWS.filter((report) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      report.name.toLowerCase().includes(term) ||
      report.type.toLowerCase().includes(term) ||
      report.date.toLowerCase().includes(term) ||
      String(report.id).includes(term)
    );
  });
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <span className="iconBadge">
              <ClipboardList aria-hidden="true" />
            </span>
            <div className="titleText">
              <DashboardPageTitle />
              <p className="lead">รายการรายงานตัวอย่าง</p>
            </div>
          </div>
          <Link href="/upload" className="navLink">
            <UploadCloud aria-hidden="true" />
            นำเข้าไฟล์
          </Link>
        </div>

        <DashboardTabs />

        <div className="filterGrid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field">
            <div className="inputWithIcon">
              <Search aria-hidden="true" />
              <input
                type="text"
                aria-label="ค้นหารายงาน"
                placeholder="พิมพ์ชื่อรายงาน วันที่ หมายเลข"
                className="fieldInput"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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
                onFocus={(event) => {
                  event.target.style.borderColor = "var(--accent)";
                  event.target.style.boxShadow = "0 0 0 4px var(--accent-glow)";
                }}
                onBlur={(event) => {
                  event.target.style.borderColor = "var(--border-strong)";
                  event.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </div>

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          รายงานทั้งหมด ({filteredRows.length} รายการ)
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>#</th>
                <th>ชื่อรายงาน</th>
                <th style={{ width: "180px" }}>ประเภท</th>
                <th style={{ width: "220px" }}>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((report) => (
                  <tr key={report.id}>
                    <td className="fileCol">{report.id}</td>
                    <td>
                      <span className="tableCellIcon">
                        <FileText aria-hidden="true" />
                        {report.name}
                      </span>
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <Tags aria-hidden="true" />
                        {report.type}
                      </span>
                    </td>
                    <td>
                      <span className="tableCellIcon">
                        <CalendarDays aria-hidden="true" />
                        {report.date}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={4}>
                    ไม่พบรายงาน
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
