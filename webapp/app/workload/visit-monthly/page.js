"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import ModuleHeader from "@/components/module-header";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

export default function VisitMonthlyWorkloadPage() {
  const [data, setData] = useState(null);
  const [fiscalYear, setFiscalYear] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [hospcode, setHospcode] = useState("");
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
    fetch(`/api/visit-monthly-workload?${params}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Failed to load monthly visit workload");
        setData(payload);
        if (!fiscalYear && payload.fiscalYear) setFiscalYear(String(payload.fiscalYear));
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fiscalYear, affiliation, hospcode]);

  const rows = data?.rows || [];
  const months = data?.months || [];
  const exportParams = new URLSearchParams();
  if (fiscalYear) exportParams.set("fiscalYear", fiscalYear);
  if (affiliation) exportParams.set("affiliation", affiliation);
  if (hospcode) exportParams.set("hospcode", hospcode);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel ncdWorkloadPanel">
        <ModuleHeader subtitle="จำนวนการรับบริการผู้ป่วยนอกรายหน่วยบริการ แยกตามเดือน" />

        {error ? <div className="error">{error}</div> : null}

        <div className="filterGrid ncdWorkloadFilters">
          <label className="field"><span className="srOnly">เลือกปีงบประมาณ</span>
            <select value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} disabled={loading}>
              {(data?.fiscalYears || []).map((year) => <option key={year} value={year}>ปีงบประมาณ {year}</option>)}
            </select>
          </label>
          <label className="field"><span className="srOnly">เลือกสังกัด</span>
            <select value={affiliation} onChange={(event) => { setAffiliation(event.target.value); setHospcode(""); }} disabled={loading}>
              <option value="">ทุกสังกัด</option>
              {(data?.affiliations || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field"><span className="srOnly">เลือกหน่วยบริการ</span>
            <select value={hospcode} onChange={(event) => setHospcode(event.target.value)} disabled={loading}>
              <option value="">ทุกหน่วยบริการ</option>
              {(data?.hospitals || []).map((hospital) => <option key={hospital.hospcode} value={hospital.hospcode}>{hospital.hospcode}{hospital.hospname ? ` — ${hospital.hospname}` : ""}</option>)}
            </select>
          </label>
        </div>

        <div className="workloadDatagridActions">
          <a className="exportXlsxLink workloadExportLink" href={`/api/visit-monthly-workload/export?${exportParams}`}>
            <FileSpreadsheet aria-hidden="true" />
            ส่งออก Excel
          </a>
        </div>

        <div className="tableWrap ncdWorkloadTableWrap">
          <table className="fileTable visitMonthlyWorkloadTable">
            <thead>
              <tr><th rowSpan={2}>หน่วยบริการ</th>{months.map((month) => <th key={month.value} className="visitMonthGroup" colSpan={2}>{month.label}</th>)}</tr>
              <tr>{months.flatMap((month) => [<th key={`${month.value}-person`} className="numCol visitMonthFirst">คน</th>, <th key={`${month.value}-count`} className="numCol">ครั้ง</th>])}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => <tr key={row.hospcode}>
                <td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>
                {months.flatMap((month) => {
                  const value = row.months?.[month.value] || { visitPerson: 0, visitCount: 0 };
                  return [<td key={`${month.value}-person`} className="numCol visitMonthFirst">{formatNumber(value.visitPerson)}</td>, <td key={`${month.value}-count`} className="numCol">{formatNumber(value.visitCount)}</td>];
                })}
              </tr>) : <tr><td className="emptyCell" colSpan={1 + months.length * 2}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
