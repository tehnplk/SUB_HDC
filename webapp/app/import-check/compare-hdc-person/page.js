"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const TYPE_LABELS = ["Type 1", "Type 2", "Type 3", "Type 4", "Type 5"];
// type1 / type3 คือประชากรรับผิดชอบ — SUB-HDC น้อยกว่า HDC = ข้อมูลนำเข้าไม่ครบ
const ALERT_TYPE_INDEXES = new Set([0, 2]);

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function formatSignedNumber(value) {
  const number = Number(value || 0);
  const formatted = Math.abs(number).toLocaleString("th-TH");
  if (number === 0) return "0";
  return number > 0 ? `+${formatted}` : `-${formatted}`;
}

function formatDate(value) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function CompareHdcPersonPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/compare-hdc-person", { cache: "no-store" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Failed to load HDC comparison");
        setData(payload);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = data?.rows || [];

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="เปรียบเทียบประชากรแยก TYPEAREA ระหว่าง HDC กับ SUB-HDC รายหน่วยบริการ" />

        {error ? <div className="error">{error}</div> : null}

        <div className="compareHdcSyncMeta">
          <RefreshCw aria-hidden="true" />
          {loading
            ? "…"
            : `ดึงข้อมูลจาก HDC กลางเมื่อ : ${formatDate(data?.hdcFetchedAt)} และประมวลผล PERSON ที่ SUB-HDC เมื่อ : ${formatDate(data?.transformedAt)}`}
        </div>

        <div className="tableWrap">
          <table className="fileTable compareHdcTable">
            <thead>
              <tr>
                <th rowSpan={2}>หน่วยบริการ</th>
                {TYPE_LABELS.map((label, index) => (
                  <th
                    key={label}
                    colSpan={3}
                    className={`compareGroupHeader${ALERT_TYPE_INDEXES.has(index) ? " compareTargetHeader" : " compareDimCol"}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
              <tr>
                {TYPE_LABELS.map((label, index) => {
                  const tone = ALERT_TYPE_INDEXES.has(index) ? " compareTargetHeader" : " compareDimCol";
                  return [
                    <th key={`${label}-hdc`} className={`numCol compareGroupCol${tone}`}>HDC</th>,
                    <th key={`${label}-sub`} className={`numCol${tone}`}>SUB-HDC</th>,
                    <th key={`${label}-diff`} className={`numCol${tone}`}>ส่วนต่าง</th>,
                  ];
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.hospcode}>
                  <td className="fileCol">
                    {row.hospcode}
                    {row.hospname ? (
                      <span className="hospNameShort">{row.hospname}</span>
                    ) : null}
                  </td>
                  {row.types.map((type, index) => {
                    const tone = ALERT_TYPE_INDEXES.has(index) ? " compareTargetCell" : " compareDimCol";
                    return [
                      <td key={`${row.hospcode}-${index}-hdc`} className={`numCol compareGroupCol${tone}`}>
                        {formatNumber(type.hdc)}
                      </td>,
                      <td key={`${row.hospcode}-${index}-sub`} className={`numCol${tone}`}>
                        {formatNumber(type.sub)}
                      </td>,
                      <td
                        key={`${row.hospcode}-${index}-diff`}
                        className={`numCol compareDiffCell${tone}${ALERT_TYPE_INDEXES.has(index) ? " compareTargetDiff" : ""}`}
                      >
                        {ALERT_TYPE_INDEXES.has(index) && type.diff < 0 ? (
                          <span className="diffBadgeDanger">{formatSignedNumber(type.diff)}</span>
                        ) : (
                          ALERT_TYPE_INDEXES.has(index) ? formatSignedNumber(type.diff) : formatNumber(type.diff)
                        )}
                      </td>,
                    ];
                  })}
                </tr>
              )) : (
                <tr>
                  <td className="emptyCell" colSpan={16}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูลเปรียบเทียบ"}
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
