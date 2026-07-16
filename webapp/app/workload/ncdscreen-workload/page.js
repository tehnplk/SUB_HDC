"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Building2, ClipboardCheck, FileSpreadsheet, HeartPulse, Stethoscope } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import ExcelExportButton from "@/components/excel-export-button";
import HospitalFilter from "@/components/hospital-filter";
import FiscalYearFilter from "@/components/fiscal-year-filter";
import AffiliationFilter from "@/components/affiliation-filter";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function TrendLine({ data }) {
  const width = 920;
  const height = 300;
  const padding = { top: 24, right: 28, bottom: 46, left: 58 };
  const values = data.flatMap((item) => [Number(item.dm || 0), Number(item.ht || 0)]);
  const max = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const pointsFor = (field) => data.map((item, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(data.length - 1, 1);
    const y = padding.top + chartHeight - (Number(item[field] || 0) / max) * chartHeight;
    return { ...item, x, y };
  });
  const dmPoints = pointsFor("dm");
  const htPoints = pointsFor("ht");

  return (
    <div className="ncdTrendCanvas" role="img" aria-label="กราฟเส้นแนวโน้มผลรวมการคัดกรองรายเดือน">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((mark) => {
          const y = padding.top + chartHeight - chartHeight * mark;
          return <line key={mark} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="ncdTrendGrid" />;
        })}
        <text x={padding.left - 10} y={padding.top + 4} textAnchor="end" className="ncdTrendAxis">{formatNumber(max)}</text>
        <text x={padding.left - 10} y={padding.top + chartHeight / 2 + 4} textAnchor="end" className="ncdTrendAxis">{formatNumber(Math.round(max / 2))}</text>
        <text x={padding.left - 10} y={padding.top + chartHeight + 4} textAnchor="end" className="ncdTrendAxis">0</text>
        <polyline points={dmPoints.map((point) => `${point.x},${point.y}`).join(" ")} className="ncdTrendLine dm" />
        <polyline points={htPoints.map((point) => `${point.x},${point.y}`).join(" ")} className="ncdTrendLine ht" />
        {dmPoints.map((point) => (
          <g key={point.value}>
            <circle cx={point.x} cy={point.y} r="5" className="ncdTrendPoint dm"><title>{`${point.label} DM: ${formatNumber(point.dm)}`}</title></circle>
            <text x={point.x} y={height - 16} textAnchor="middle" className="ncdTrendAxis">{point.label}</text>
          </g>
        ))}
        {htPoints.map((point) => <circle key={`ht-${point.value}`} cx={point.x} cy={point.y} r="5" className="ncdTrendPoint ht"><title>{`${point.label} HT: ${formatNumber(point.ht)}`}</title></circle>)}
      </svg>
    </div>
  );
}

export default function NcdScreenWorkloadPage() {
  const [data, setData] = useState(null);
  const [fiscalYear, setFiscalYear] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [hospcode, setHospcode] = useState("");
  const [tab, setTab] = useState("dm");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (fiscalYear) params.set("fiscalYear", fiscalYear);
    if (affiliation) params.set("affiliation", affiliation);
    if (hospcode) params.set("hospcode", hospcode);
    setLoading(true);
    setError("");
    fetch(`/api/ncdscreen-workload?${params}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Failed to load NCD screening workload");
        setData(payload);
        if (!fiscalYear && payload.fiscalYear) setFiscalYear(String(payload.fiscalYear));
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fiscalYear, affiliation, hospcode]);

  const summary = data?.summary || { dm: 0, ht: 0, total: 0 };
  const rows = data?.rows || [];
  const trend = useMemo(() => data?.trend || [], [data]);
  const months = data?.months || [];
  const metricKey = tab === "ht" ? "ht" : "dm";
  const exportParams = new URLSearchParams({ metric: metricKey });
  if (fiscalYear) exportParams.set("fiscalYear", fiscalYear);
  if (affiliation) exportParams.set("affiliation", affiliation);
  if (hospcode) exportParams.set("hospcode", hospcode);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel ncdWorkloadPanel">
        <ModuleHeader subtitle="ติดตามผลงานคัดกรองเบาหวานและความดัน เฉพาะประชากร Typearea 1 หรือ 3" />

        {error ? <div className="error">{error}</div> : null}

        <div className="ncdWorkloadHero">
          <div>
            <span className="ncdEyebrow"><Activity aria-hidden="true" /> NCD SCREENING</span>
            <h1>การคัดกรองเบาหวานความดัน</h1>
            <p>ดูผลรายหน่วยบริการและแนวโน้มรายเดือนในปีงบประมาณเดียวกัน</p>
          </div>
          <div className="filterGrid ncdWorkloadFilters">
            <FiscalYearFilter value={fiscalYear} years={data?.fiscalYears || []} disabled={loading} onChange={setFiscalYear} label="ปีงบประมาณ" showLabel />
            <AffiliationFilter value={affiliation} affiliations={data?.affiliations || []} disabled={loading} onChange={(name) => { setAffiliation(name); setHospcode(""); }} />
            <HospitalFilter value={hospcode} onChange={setHospcode} hospitals={data?.hospitals || []} disabled={loading} label="หน่วยบริการ" />
          </div>
        </div>

        <div className="ncdSummaryGrid">
          <div className="ncdMetricCard dm"><Stethoscope aria-hidden="true" /><span>คัดกรองเบาหวาน</span><strong>{loading ? "…" : formatNumber(summary.dm)}</strong></div>
          <div className="ncdMetricCard ht"><HeartPulse aria-hidden="true" /><span>คัดกรองความดัน</span><strong>{loading ? "…" : formatNumber(summary.ht)}</strong></div>
          <div className="ncdMetricCard total"><ClipboardCheck aria-hidden="true" /><span>ผลรวม</span><strong>{loading ? "…" : formatNumber(summary.total)}</strong></div>
        </div>

        <div className="ncdTabBar" role="tablist" aria-label="รูปแบบข้อมูล">
          <button type="button" role="tab" aria-selected={tab === "dm"} className={tab === "dm" ? "active" : ""} onClick={() => setTab("dm")}><Building2 aria-hidden="true" />คัดกรองเบาหวาน (ครั้ง)</button>
          <button type="button" role="tab" aria-selected={tab === "ht"} className={tab === "ht" ? "active" : ""} onClick={() => setTab("ht")}><Building2 aria-hidden="true" />คัดกรองความดัน (ครั้ง)</button>
          <button type="button" role="tab" aria-selected={tab === "trend"} className={tab === "trend" ? "active" : ""} onClick={() => setTab("trend")}><BarChart3 aria-hidden="true" />แนวโน้มรายเดือน</button>
        </div>

        {tab === "dm" || tab === "ht" ? (
          <>
            <div className="workloadDatagridActions">
              <ExcelExportButton href={`/api/ncdscreen-workload/export?${exportParams}`}>
                <FileSpreadsheet aria-hidden="true" />
                ส่งออก Excel
              </ExcelExportButton>
            </div>
            <div className="tableWrap ncdWorkloadTableWrap">
            <table className="fileTable ncdScreenWorkloadTable">
              <thead><tr><th>หน่วยบริการ</th>{months.map((month) => <th key={month.value} className="numCol">{month.label}</th>)}</tr></thead>
              <tbody>{rows.length ? rows.map((row) => <tr key={row.hospcode}><td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>{months.map((month) => <td key={month.value} className="numCol">{formatNumber(row.months?.[month.value]?.[metricKey])}</td>)}</tr>) : <tr><td className="emptyCell" colSpan={1 + months.length}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}</tbody>
            </table>
            <table className="fileTable ncdWorkloadTable ncdMonthlyWorkloadTable">
              <thead>
                <tr>
                  <th rowSpan={2}>หน่วยบริการ</th>
                  {months.map((month) => <th key={month.value} className="ncdMonthGroup" colSpan={2}>{month.label}</th>)}
                </tr>
                <tr>
                  {months.flatMap((month) => [<th key={`${month.value}-dm`} className="numCol">DM</th>, <th key={`${month.value}-ht`} className="numCol">HT</th>])}
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => <tr key={row.hospcode}>
                  <td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>
                  {months.flatMap((month) => {
                    const value = row.months?.[month.value] || { dm: 0, ht: 0 };
                    return [<td key={`${month.value}-dm`} className="numCol">{formatNumber(value.dm)}</td>, <td key={`${month.value}-ht`} className="numCol">{formatNumber(value.ht)}</td>];
                  })}
                </tr>) : <tr><td className="emptyCell" colSpan={1 + months.length * 2}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}
              </tbody>
            </table>
            <table className="fileTable ncdWorkloadTable ncdLegacyWorkloadTable">
              <thead><tr className="ncdTableSummary"><th aria-label="สรุปผล" /><th className="numCol"><strong>{loading ? "—" : formatNumber(summary.dm)}</strong></th><th className="numCol"><strong>{loading ? "—" : formatNumber(summary.ht)}</strong></th><th className="numCol"><strong>{loading ? "—" : formatNumber(summary.total)}</strong></th></tr><tr><th>หน่วยบริการ</th><th className="numCol">คัดกรองเบาหวาน</th><th className="numCol">คัดกรองความดัน</th><th className="numCol">ผลรวม</th></tr></thead>
              <tbody>{rows.length ? rows.map((row) => <tr key={row.hospcode}><td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td><td className="numCol">{formatNumber(row.dm)}</td><td className="numCol">{formatNumber(row.ht)}</td><td className="numCol ncdTotalCell">{formatNumber(row.total)}</td></tr>) : <tr><td className="emptyCell" colSpan={4}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}</tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="ncdTrendPanel">
            <div className="ncdTrendTitle"><div><span>แนวโน้มรายเดือน</span><strong>เบาหวาน + ความดัน</strong></div><span className="ncdLegend"><i className="dm" />คัดกรองเบาหวาน (ครั้ง)<i className="ht" />คัดกรองความดัน (ครั้ง)</span></div>
            {trend.length ? <TrendLine data={trend} /> : <div className="emptyState">ไม่พบข้อมูลแนวโน้ม</div>}
          </div>
        )}
      </section>
    </div>
  );
}
