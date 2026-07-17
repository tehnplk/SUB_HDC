"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import ExcelExportButton from "@/components/excel-export-button";
import HospitalFilter from "@/components/hospital-filter";
import FiscalYearFilter from "@/components/fiscal-year-filter";
import AffiliationFilter from "@/components/affiliation-filter";

function formatDate(value) {
  if (!value || !/^\d{8}$/.test(value)) return value || "-";
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
}

function formatTransformedAt(value) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function errorTypeLabel(value) {
  if (value === "not_standard") return "ไม่ตรงรหัสมาตรฐาน";
  if (value === "cancelled") return "รหัสยกเลิกแล้ว";
  return value || "-";
}

export default function SpecialppErrorPage() {
  const [data, setData] = useState(null);
  const [fiscalYear, setFiscalYear] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [hospcode, setHospcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailState, setDetailState] = useState({ open: false, loading: false, error: "", hospital: null, rows: [] });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (fiscalYear) params.set("fiscalYear", fiscalYear);
    if (affiliation) params.set("affiliation", affiliation);
    if (hospcode) params.set("hospcode", hospcode);
    setLoading(true);
    setError("");
    fetch(`/api/quality/specialpp-error?${params}`, { cache: "no-store", signal: controller.signal })
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
  const exportHrefFor = (rowHospcode) => {
    const params = new URLSearchParams({ hospcode: rowHospcode });
    if (fiscalYear) params.set("fiscalYear", fiscalYear);
    if (affiliation) params.set("affiliation", affiliation);
    return `/api/quality/specialpp-error/export?${params}`;
  };

  const openDetails = async (hospital) => {
    setDetailState({ open: true, loading: true, error: "", hospital, rows: [] });
    const params = new URLSearchParams({ details: "1", hospcode: hospital.hospcode });
    if (fiscalYear) params.set("fiscalYear", fiscalYear);
    if (affiliation) params.set("affiliation", affiliation);
    try {
      const response = await fetch(`/api/quality/specialpp-error?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
      setDetailState({ open: true, loading: false, error: "", hospital, rows: payload.rows || [] });
    } catch (loadError) {
      setDetailState((current) => ({ ...current, loading: false, error: loadError.message }));
    }
  };

  const closeDetails = () => setDetailState({ open: false, loading: false, error: "", hospital: null, rows: [] });

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="บันทึกรหัสคัดกรอง SPECIAL PP ที่ไม่ตรงรหัสมาตรฐานหรือยกเลิกไปแล้ว (SPECIALPP - PPSPECIAL)" />

        {error ? <div className="error">{error}</div> : null}

        <div className="filterGrid qualityFilters">
          <FiscalYearFilter value={fiscalYear} years={data?.fiscalYears || []} disabled={loading} onChange={(year) => { setFiscalYear(year); setAffiliation(""); setHospcode(""); }} />
          <AffiliationFilter value={affiliation} affiliations={data?.affiliations || []} disabled={loading} onChange={(name) => { setAffiliation(name); setHospcode(""); }} />
          <HospitalFilter value={hospcode} onChange={setHospcode} hospitals={data?.hospitals || []} disabled={loading} />
        </div>

        <div className="dataSourceLabel">
          <Database aria-hidden="true" />
          <span>แหล่งข้อมูล: ตารางสรุป t_specialpp_error (แฟ้ม SPECIALPP เทียบ c_specialpp_ppspecial)</span>
          <span className="processedAt">ประมวลผลเมื่อ: {loading ? "..." : formatTransformedAt(data?.transformedAt)}</span>
        </div>

        <div className="tableMeta metaLine dupMetaRow">
          <span>ทั้งหมด {Number(data?.count || 0).toLocaleString("th-TH")} รายการ</span>
        </div>

        <div className="tableWrap">
          <table className="fileTable specialppErrorTable">
            <colgroup><col /><col className="specialppAffiliationCol" /><col className="specialppYearCol" /><col className="specialppCountCol" /><col className="specialppCountCol" /><col className="specialppCountCol" /><col className="specialppActionCol" /></colgroup>
            <thead>
              <tr>
                <th>หน่วยบริการ</th>
                <th>สังกัด</th>
                <th className="numCol">ปีงบ</th>
                <th className="numCol">ไม่ตรงรหัสมาตรฐาน</th>
                <th className="numCol">รหัสยกเลิกแล้ว</th>
                <th className="numCol">รวม</th>
                <th className="exportCol">ส่งออก Excel</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.hospcode}>
                  <td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>
                  <td>{row.affiliation || "-"}</td>
                  <td className="numCol">{data?.fiscalYear || "-"}</td>
                  <td className="numCol">{Number(row.not_standard || 0).toLocaleString("th-TH")}</td>
                  <td className="numCol">{Number(row.cancelled || 0).toLocaleString("th-TH")}</td>
                  <td className="numCol"><button type="button" className="tableCountButton" onClick={() => openDetails(row)}>{Number(row.total || 0).toLocaleString("th-TH")}</button></td>
                  <td className="exportCol"><ExcelExportButton href={exportHrefFor(row.hospcode)} /></td>
                </tr>
              )) : <tr><td className="emptyCell" colSpan={7}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {detailState.open ? (
        <div className="reportModalBackdrop" role="presentation" onClick={closeDetails}>
          <section className="reportModal" role="dialog" aria-modal="true" aria-labelledby="specialpp-details-title" onClick={(event) => event.stopPropagation()}>
            <div className="reportModalHeader">
              <div>
                <h2 id="specialpp-details-title">{detailState.hospital?.hospcode} {detailState.hospital?.hospname}</h2>
                <p>{detailState.loading ? "กำลังโหลดข้อมูล..." : `${detailState.rows.length.toLocaleString("th-TH")} รายการ`}</p>
              </div>
              <div className="reportModalActions">
                {detailState.hospital ? <ExcelExportButton href={exportHrefFor(detailState.hospital.hospcode)} /> : null}
                <button type="button" className="reportModalClose" onClick={closeDetails} aria-label="ปิด">×</button>
              </div>
            </div>
            {detailState.error ? <div className="error">{detailState.error}</div> : null}
            <div className="tableWrap reportResultWrap">
              <table className="fileTable">
                <thead><tr><th className="numCol">ปีงบประมาณ</th><th className="numCol">PID</th><th>SEQ</th><th>วันที่รับบริการ</th><th>รหัส PPSPECIAL</th><th>ชื่อรหัส</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {detailState.loading ? <tr><td className="emptyCell" colSpan={7}>กำลังโหลดข้อมูล...</td></tr> : detailState.rows.length ? detailState.rows.map((row) => (
                    <tr key={`${row.fiscal_year}-${row.pid}-${row.seq}-${row.date_serve}-${row.ppspecial}`}><td className="numCol">{row.fiscal_year}</td><td className="numCol">{row.pid}</td><td>{row.seq}</td><td>{formatDate(row.date_serve)}</td><td>{row.ppspecial || "-"}</td><td>{row.ppspecial_name || "-"}</td><td>{errorTypeLabel(row.error_type)}</td></tr>
                  )) : <tr><td className="emptyCell" colSpan={7}>ไม่พบข้อมูล</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
