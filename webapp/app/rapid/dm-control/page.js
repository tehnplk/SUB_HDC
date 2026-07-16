"use client";

import { useMemo } from "react";
import { MapPin, Target, CheckCircle2, Percent, TriangleAlert, RefreshCw, FileSpreadsheet, Download, Database } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import ExcelExportButton from "@/components/excel-export-button";
import AffiliationFilter from "@/components/affiliation-filter";
import { useRapidReport } from "../_lib/use-rapid-report";
import RapidHdcReportMeta from "../_components/rapid-hdc-report-meta";
import { formatNumber, formatPercent, formatAffiliation, formatDate } from "../_lib/rapid-format";
import { sortRows, SortHeader } from "../_lib/rapid-sort";

// ผู้ป่วย DM ควบคุมน้ำตาลได้ดี (HDC report_id 143)
// layout พิเศษ: เป้าหมาย → ได้รับการตรวจ (control) → % ตรวจ → คุมได้ดี (result) → % คุมได้ → ยังไม่ได้ตรวจ
const REPORT_ID = "143";

export default function RapidDmControlPage() {
  const { data, loading, error, affiliation, affiliations, setParam, filteredRows, summary, sortKey, sortDir, toggleSort, downloadIndividual } = useRapidReport(REPORT_ID);

  const sortColumns = useMemo(() => [
    { key: "hospcode", label: "หน่วยบริการ", type: "text" },
    { key: "affiliation", label: "สังกัด", type: "text", className: "rapidAffCol" },
    { key: "target", label: data?.targetLabel || "ผู้ป่วย DM", type: "num", numCol: true },
    { key: "control", label: data?.controlLabel || "ได้รับการตรวจ", type: "num", numCol: true },
    { key: "screenPercent", label: "% ตรวจ", type: "num", numCol: true },
    { key: "result", label: data?.resultLabel || "คุมน้ำตาลได้ดี", type: "num", numCol: true },
    { key: "controlPercent", label: "% คุมได้", type: "num", numCol: true },
    { key: "unexamined", label: "ยังไม่ได้ตรวจ", type: "num", numCol: true },
  ], [data?.targetLabel, data?.controlLabel, data?.resultLabel]);

  const rows = sortRows(filteredRows, sortColumns, sortKey, sortDir);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle={data?.title || "งานเร่งรัดติดตามรายตัวชี้วัด"} />

        {error ? <div className="error">{error}</div> : null}

        <div className="rapidSummaryLine">
          <span><MapPin aria-hidden="true" />อำเภอ <strong>{loading ? "…" : (data?.ampName || "-")}</strong></span>
          <span><Target aria-hidden="true" />{data?.targetLabel || "ผู้ป่วย DM"} <strong>{loading ? "…" : formatNumber(summary.target)}</strong></span>
          <span><CheckCircle2 aria-hidden="true" />{data?.controlLabel || "ได้รับการตรวจ"} <strong>{loading ? "…" : formatNumber(summary.control)}</strong></span>
          <span><Percent aria-hidden="true" />ตรวจ <strong>{loading ? "…" : formatPercent(summary.screenPercent)}</strong></span>
          <span><CheckCircle2 aria-hidden="true" />{data?.resultLabel || "คุมน้ำตาลได้ดี"} <strong>{loading ? "…" : formatNumber(summary.result)}</strong></span>
          <span><Percent aria-hidden="true" />คุมได้ <strong>{loading ? "…" : formatPercent(summary.controlPercent)}</strong></span>
          <span><TriangleAlert aria-hidden="true" />ยังไม่ได้ตรวจ <strong>{loading ? "…" : formatNumber(summary.unexamined)}</strong></span>
          <span className="rapidSourceLabel"><Database aria-hidden="true" />แหล่งข้อมูลจาก HDC กลาง</span>
        </div>

        <div className="rapidToolbar">
          <AffiliationFilter value={affiliation} affiliations={affiliations} disabled={loading} onChange={(name) => setParam("aff", name)} className="field rapidSelect" />
          <ExcelExportButton href={`/api/rapid/${REPORT_ID}/export${affiliation ? `?affiliation=${encodeURIComponent(affiliation)}` : ""}`}>
            <FileSpreadsheet aria-hidden="true" />
            ส่งออก Excel
          </ExcelExportButton>
        </div>

        <RapidHdcReportMeta loading={loading} reportName={data?.hdc_report_name} sourceTable={data?.source_table} />

        <div className="tableWrap rapidTableWrap">
          <table className="fileTable rapidTable">
            <thead>
              <tr>{sortColumns.map((column) => (
                <SortHeader key={column.key} column={column} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              ))}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.hospcode}>
                  <td className="fileCol">
                    {row.hospcode}
                    {row.hospname ? <span className="hospNameShort rapidHospName">{row.hospname}</span> : null}
                  </td>
                  <td className="rapidAffCol">{formatAffiliation(row.affiliation)}</td>
                  <td className="numCol">{formatNumber(row.target)}</td>
                  <td className="numCol">{formatNumber(row.control)}</td>
                  <td className="numCol">{formatPercent(row.screenPercent)}</td>
                  <td className="numCol">{formatNumber(row.result)}</td>
                  <td className="numCol">{formatPercent(row.controlPercent)}</td>
                  <td className="numCol">
                    <button type="button" className="deficitDownload" onClick={() => downloadIndividual(row)}>
                      {formatNumber(row.unexamined)}
                      <Download aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="emptyCell" colSpan={sortColumns.length}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="compareHdcSyncMeta">
          <RefreshCw aria-hidden="true" />
          {loading ? "…" : `ดึงข้อมูลสด จาก HDC (ปีงบ ${data?.year}) เมื่อ : ${formatDate(data?.fetchedAt)}`}
        </div>
      </section>
    </div>
  );
}
