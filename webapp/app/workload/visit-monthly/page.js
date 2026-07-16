"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import HospitalFilter from "@/components/hospital-filter";
import FiscalYearFilter from "@/components/fiscal-year-filter";
import AffiliationFilter from "@/components/affiliation-filter";

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
          <FiscalYearFilter value={fiscalYear} years={data?.fiscalYears || []} disabled={loading} onChange={setFiscalYear} />
          <AffiliationFilter value={affiliation} affiliations={data?.affiliations || []} disabled={loading} onChange={(name) => { setAffiliation(name); setHospcode(""); }} />
          <HospitalFilter value={hospcode} onChange={setHospcode} hospitals={data?.hospitals || []} disabled={loading} allLabel="ทุกหน่วยบริการ" />
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
