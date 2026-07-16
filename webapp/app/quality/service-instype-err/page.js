"use client";

import { useEffect, useState } from "react";
import ModuleHeader from "@/components/module-header";
import HospitalFilter from "@/components/hospital-filter";
import FiscalYearFilter from "@/components/fiscal-year-filter";
import AffiliationFilter from "@/components/affiliation-filter";

function formatDate(value) {
  if (!value || !/^\d{8}$/.test(value)) return value || "-";
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
}

export default function ServiceInstypeErrorPage() {
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
    fetch(`/api/quality/service-instype-err?${params}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
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

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ" />

        {error ? <div className="error">{error}</div> : null}

        <div className="filterGrid ncdWorkloadFilters">
          <FiscalYearFilter value={fiscalYear} years={data?.fiscalYears || []} disabled={loading} onChange={(year) => { setFiscalYear(year); setAffiliation(""); setHospcode(""); }} />
          <AffiliationFilter value={affiliation} affiliations={data?.affiliations || []} disabled={loading} onChange={(name) => { setAffiliation(name); setHospcode(""); }} />
          <HospitalFilter value={hospcode} onChange={setHospcode} hospitals={data?.hospitals || []} disabled={loading} />
        </div>

        <div className="tableMeta metaLine dupMetaRow">
          <span>ทั้งหมด {Number(data?.count || 0).toLocaleString("th-TH")} รายการ</span>
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th>หน่วยบริการ</th>
                <th>สังกัด</th>
                <th className="numCol">ปีงบประมาณ</th>
                <th className="numCol">PID</th>
                <th>SEQ</th>
                <th>วันที่รับบริการ</th>
                <th>รหัสสิทธิ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={`${row.hospcode}-${row.fiscal_year}-${row.pid}-${row.seq}-${row.date_serve}-${row.instype}`}>
                  <td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>
                  <td>{row.affiliation || "-"}</td>
                  <td className="numCol">{row.fiscal_year}</td>
                  <td className="numCol">{row.pid}</td>
                  <td>{row.seq}</td>
                  <td>{formatDate(row.date_serve)}</td>
                  <td>{row.instype || "-"}</td>
                </tr>
              )) : (
                <tr><td className="emptyCell" colSpan={7}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
