"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Target, CheckCircle2, Percent, TriangleAlert, RefreshCw, FileSpreadsheet, Download, ChevronUp, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import ModuleHeader from "@/components/module-header";

// คอลัมน์ที่ sort ได้ — key ต้องตรงกับ field ใน row
const BASE_SORT_COLUMNS = [
  { key: "hospcode", label: "หน่วยบริการ", type: "text" },
  { key: "affiliation", label: "สังกัด", type: "text" },
  { key: "target", label: "เป้าหมาย", type: "num", numCol: true },
  { key: "result", label: "ผลงาน", type: "num", numCol: true },
  { key: "percent", label: "ร้อยละ", type: "num", numCol: true },
  { key: "deficit", label: "ส่วนขาด", type: "num", numCol: true },
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "…";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function RapidDetailPage() {
  const { id } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rapid/${id}`, { cache: "no-store" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
        setData(payload);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  // อัปเดต query string หนึ่งพารามิเตอร์ (ค่าว่าง = ลบทิ้ง)
  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // อำเภอ fix จาก .env AMP_CODE — API filter มาแล้ว; สังกัด/sort กรองด้วย query string
  const affiliation = searchParams.get("aff") || "";
  const allRows = data?.rows || [];
  const affiliations = useMemo(
    () => [...new Set(allRows.map((row) => row.affiliation).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [allRows]
  );
  const filteredRows = useMemo(
    () => (affiliation ? allRows.filter((row) => row.affiliation === affiliation) : allRows),
    [allRows, affiliation]
  );

  // สถานะ sort อ่านจาก query string (?sort=&dir=) — default เรียงตาม hospcode
  const sortKey = searchParams.get("sort") || "hospcode";
  const sortDir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const sortColumns = useMemo(
    () => data?.controlLabel
      ? [
        ...BASE_SORT_COLUMNS.slice(0, 2),
        { key: "target", label: data?.targetLabel || "ผู้ป่วย DM", type: "num", numCol: true },
        { key: "control", label: data.controlLabel, type: "num", numCol: true },
        { key: "screenPercent", label: "% ตรวจ", type: "num", numCol: true },
        { key: "result", label: data?.resultLabel || "คุมน้ำตาลได้ดี", type: "num", numCol: true },
        { key: "controlPercent", label: "% คุมได้", type: "num", numCol: true },
        { key: "unexamined", label: "ยังไม่ได้ตรวจ", type: "num", numCol: true },
      ]
      : BASE_SORT_COLUMNS.map((column) => column.key === "result" ? { ...column, label: data?.resultLabel || column.label } : column),
    [data?.controlLabel, data?.resultLabel]
  );
  const sortColumn = sortColumns.find((column) => column.key === sortKey) || sortColumns[0];

  const rows = useMemo(() => {
    const sign = sortDir === "desc" ? -1 : 1;
    return [...filteredRows].sort((left, right) => {
      const a = left[sortColumn.key];
      const b = right[sortColumn.key];
      if (sortColumn.type === "num") return (Number(a || 0) - Number(b || 0)) * sign;
      return String(a || "").localeCompare(String(b || ""), "th") * sign;
    });
  }, [filteredRows, sortColumn, sortDir]);

  function toggleSort(key) {
    // คลิกซ้ำคอลัมน์เดิม = สลับทิศ; คอลัมน์ใหม่ = เริ่มจาก asc
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", nextDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const summary = useMemo(() => {
    const target = rows.reduce((sum, row) => sum + row.target, 0);
    const result = rows.reduce((sum, row) => sum + row.result, 0);
    const control = rows.reduce((sum, row) => sum + row.control, 0);
    return {
      units: rows.length,
      target,
      result,
      control,
      screenPercent: target > 0 ? (control / target) * 100 : 0,
      controlPercent: control > 0 ? (result / control) * 100 : 0,
      unexamined: target - control,
      percent: target > 0 ? (result / target) * 100 : 0,
      deficit: target - result,
    };
  }, [rows]);

  // คลิกส่วนขาด → ดาวน์โหลดรายชื่อรายคน (ยังไม่มีข้อมูล PERSON ครบ → แจ้งเตือน)
  function downloadIndividual(row) {
    Swal.fire({
      icon: "info",
      title: "ยังดาวน์โหลดไม่ได้",
      text: "ข้อมูล PERSON ในระบบ SUB-HDC ของหน่วยบริการนี้ยังไม่ครบ",
      confirmButtonText: "รับทราบ",
    });
  }

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle={data?.title || "งานเร่งรัดติดตามรายตัวชี้วัด"} />

        {error ? <div className="error">{error}</div> : null}

        <div className="rapidSummaryLine">
          <span><MapPin aria-hidden="true" />อำเภอ <strong>{loading ? "…" : (data?.ampName || "-")}</strong></span>
          <span><Target aria-hidden="true" />{data?.targetLabel || "เป้าหมาย"} <strong>{loading ? "…" : formatNumber(summary.target)}</strong></span>
          {data?.controlLabel ? <>
            <span><CheckCircle2 aria-hidden="true" />{data.controlLabel} <strong>{loading ? "…" : formatNumber(summary.control)}</strong></span>
            <span><Percent aria-hidden="true" />ตรวจ <strong>{loading ? "…" : formatPercent(summary.screenPercent)}</strong></span>
            <span><CheckCircle2 aria-hidden="true" />{data.resultLabel} <strong>{loading ? "…" : formatNumber(summary.result)}</strong></span>
            <span><Percent aria-hidden="true" />คุมได้ <strong>{loading ? "…" : formatPercent(summary.controlPercent)}</strong></span>
            <span><TriangleAlert aria-hidden="true" />ยังไม่ได้ตรวจ <strong>{loading ? "…" : formatNumber(summary.unexamined)}</strong></span>
          </> : <>
            <span><CheckCircle2 aria-hidden="true" />{data?.resultLabel || "ผลงาน"} <strong>{loading ? "…" : formatNumber(summary.result)}</strong></span>
            <span><Percent aria-hidden="true" />ร้อยละ <strong>{loading ? "…" : formatPercent(summary.percent)}</strong></span>
            <span><TriangleAlert aria-hidden="true" />ส่วนขาด <strong>{loading ? "…" : formatNumber(summary.deficit)}</strong></span>
          </>}
        </div>

        <div className="rapidToolbar">
          <label className="field rapidSelect">
            <span className="srOnly">เลือกสังกัด</span>
            <select value={affiliation} onChange={(event) => setParam("aff", event.target.value)} disabled={loading}>
              <option value="">ทุกสังกัด</option>
              {affiliations.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <a
            className="exportXlsxLink"
            href={`/api/rapid/${id}/export${affiliation ? `?affiliation=${encodeURIComponent(affiliation)}` : ""}`}
          >
            <FileSpreadsheet aria-hidden="true" />
            ส่งออก Excel
          </a>
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                {sortColumns.map((column) => {
                  const active = sortKey === column.key;
                  return (
                    <th key={column.key} className={column.numCol ? "numCol" : undefined} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                      <button type="button" className={`sortHeader${active ? " sortHeaderActive" : ""}`} onClick={() => toggleSort(column.key)}>
                        {column.label}
                        {active
                          ? (sortDir === "asc" ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />)
                          : <ChevronDown className="sortHeaderIdle" aria-hidden="true" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.hospcode}>
                  <td className="fileCol">
                    {row.hospcode}
                    {row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}
                  </td>
                  <td>{row.affiliation || "-"}</td>
                  <td className="numCol">{formatNumber(row.target)}</td>
                  {data?.controlLabel ? <>
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
                  </> : <>
                    <td className="numCol">{formatNumber(row.result)}</td>
                    <td className="numCol">{formatPercent(row.percent)}</td>
                    <td className="numCol">
                      <button type="button" className="deficitDownload" onClick={() => downloadIndividual(row)}>
                        {formatNumber(row.deficit)}
                        <Download aria-hidden="true" />
                      </button>
                    </td>
                  </>}
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
