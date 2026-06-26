"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardTabs from "@/components/dashboard-tabs";
import { getFileTypeLabel, getMonthlyRowTotal } from "@/lib/dashboard-data.mjs";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function HosListDashboard() {
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFiscalYear, setSelectedFiscalYear] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedFile) params.set("file", selectedFile);
    if (selectedFiscalYear) params.set("fiscalYear", selectedFiscalYear);
    return params.toString();
  }, [selectedFile, selectedFiscalYear]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        if (!selectedFile) setSelectedFile(payload.selectedFile || "");
        if (!selectedFiscalYear) setSelectedFiscalYear(payload.selectedFiscalYear || "");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, selectedFile, selectedFiscalYear]);

  const hasData = data && !error;
  const hasMonthly = Boolean(data?.hasMonthly);
  const rows = data?.rows || [];
  const months = data?.months || [];

  const centerSuffix = data?.centerName ? ` ${data.centerName}` : "";

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div>
            <h4 className="pageHeaderTitle">SUB-HDC{centerSuffix}</h4>
            <p className="lead">จำนวนข้อมูลแต่ละแฟ้ม แยกตาม HOSCODE</p>
          </div>
          <Link href="/upload" className="navLink">
            นำเข้าไฟล์
          </Link>
        </div>

        <DashboardTabs />

        {error ? <div className="error">{error}</div> : null}

        <div className="filterGrid">
          <label className="field">
            <span>ชื่อแฟ้ม</span>
            <select
              value={data?.selectedFile || selectedFile}
              disabled={!hasData || loading}
              onChange={(event) => {
                setSelectedFile(event.target.value);
                setSelectedFiscalYear("");
              }}
            >
              {(data?.files || []).map((file) => (
                <option key={file.fileName} value={file.fileName}>
                  {file.fileName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>ปีงบประมาณ</span>
            <select
              value={data?.selectedFiscalYear || selectedFiscalYear}
              disabled={!hasData || loading || !hasMonthly}
              onChange={(event) => setSelectedFiscalYear(event.target.value)}
            >
              {hasMonthly ? (
                data.fiscalYears.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))
              ) : (
                <option value="">ไม่มี date_serv/date_admit/datetime_admit/datetime_serv</option>
              )}
            </select>
          </label>
        </div>

        <div className="statGrid statGridCompact">
          <div className="statCard">
            <span className="statValue">{formatNumber(data?.totalRows)}</span>
            <span className="statLabel">จำนวนรวม</span>
          </div>
          <div className="statCard">
            <span className="statValue">{formatNumber(rows.length)}</span>
            <span className="statLabel">HOSCODE</span>
          </div>
          <div className="statCard">
            <span className="statValue">{hasMonthly ? data?.dateColumn : "รวม"}</span>
            <span className="statLabel">รูปแบบข้อมูล</span>
          </div>
        </div>

        <div className="tableMeta">
          {loading ? "กำลังโหลด..." : getFileTypeLabel(hasMonthly)}
        </div>

        <div className="tableWrap monthlyTableWrap">
          <table className="fileTable monthlyTable">
            <thead>
              <tr>
                <th>hoscode</th>
                {hasMonthly ? (
                  months.map((month) => (
                    <th key={month.key} className="numCol monthCol">
                      {month.label}
                    </th>
                  )).concat(
                    <th key="total" className="numCol monthCol totalCol">
                      รวม
                    </th>
                  )
                ) : (
                  <th className="numCol">รวม</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.hospcode}>
                    <td className="fileCol">{row.hospcode}</td>
                    {hasMonthly ? (
                      months.map((month) => (
                        <td key={month.key} className="numCol monthCol">
                          {formatNumber(row[month.key])}
                        </td>
                      )).concat(
                        <td key="total" className="numCol monthCol totalCol">
                          {formatNumber(getMonthlyRowTotal(months, row))}
                        </td>
                      )
                    ) : (
                      <td className="numCol">{formatNumber(row.total)}</td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={hasMonthly ? months.length + 2 : 2}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
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
