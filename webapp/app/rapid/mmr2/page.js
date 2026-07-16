"use client";

import { useMemo } from "react";
import { MapPin, Target, CheckCircle2, Percent, TriangleAlert, RefreshCw, FileSpreadsheet, Download, Database } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import AffiliationFilter from "@/components/affiliation-filter";
import { useRapidReport } from "../_lib/use-rapid-report";
import RapidHdcReportMeta from "../_components/rapid-hdc-report-meta";
import { formatNumber, formatPercent, formatAffiliation, formatDate } from "../_lib/rapid-format";
import { sortRows, SortHeader } from "../_lib/rapid-sort";

// ความครอบคลุมวัคซีน MMR2 (HDC report_id 52) — เป้าหมาย/ผลงาน/ร้อยละ/ส่วนขาด
const REPORT_ID = "52";

export default function RapidMmr2Page() {
  const { data, loading, error, affiliation, affiliations, setParam, filteredRows, summary, sortKey, sortDir, toggleSort, downloadIndividual } = useRapidReport(REPORT_ID);

  const sortColumns = useMemo(() => [
    { key: "hospcode", label: "หน่วยบริการ", type: "text" },
    { key: "affiliation", label: "สังกัด", type: "text", className: "rapidAffCol" },
    { key: "target", label: data?.targetLabel || "เป้าหมาย", type: "num", numCol: true },
    { key: "result", label: data?.resultLabel || "ผลงาน", type: "num", numCol: true },
    { key: "percent", label: "ร้อยละ", type: "num", numCol: true },
    { key: "deficit", label: "ส่วนขาด", type: "num", numCol: true },
  ], [data?.targetLabel, data?.resultLabel]);

  const rows = sortRows(filteredRows, sortColumns, sortKey, sortDir);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle={data?.title || "งานเร่งรัดติดตามรายตัวชี้วัด"} />

        {error ? <div className="error">{error}</div> : null}

        <div className="rapidSummaryLine">
          <span><MapPin aria-hidden="true" />อำเภอ <strong>{loading ? "…" : (data?.ampName || "-")}</strong></span>
          <span><Target aria-hidden="true" />{data?.targetLabel || "เป้าหมาย"} <strong>{loading ? "…" : formatNumber(summary.target)}</strong></span>
          <span><CheckCircle2 aria-hidden="true" />{data?.resultLabel || "ผลงาน"} <strong>{loading ? "…" : formatNumber(summary.result)}</strong></span>
          <span><Percent aria-hidden="true" />ร้อยละ <strong>{loading ? "…" : formatPercent(summary.percent)}</strong></span>
          <span><TriangleAlert aria-hidden="true" />ส่วนขาด <strong>{loading ? "…" : formatNumber(summary.deficit)}</strong></span>
          <span className="rapidSourceLabel"><Database aria-hidden="true" />แหล่งข้อมูลจาก HDC กลาง</span>
        </div>

        <div className="rapidToolbar">
          <AffiliationFilter value={affiliation} affiliations={affiliations} disabled={loading} onChange={(name) => setParam("aff", name)} className="field rapidSelect" />
          <a className="exportXlsxLink" href={`/api/rapid/${REPORT_ID}/export${affiliation ? `?affiliation=${encodeURIComponent(affiliation)}` : ""}`}>
            <FileSpreadsheet aria-hidden="true" />
            ส่งออก Excel
          </a>
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
                  <td className="numCol">{formatNumber(row.result)}</td>
                  <td className="numCol">{formatPercent(row.percent)}</td>
                  <td className="numCol">
                    <button type="button" className="deficitDownload" onClick={() => downloadIndividual(row)}>
                      {formatNumber(row.deficit)}
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
