"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  RefreshCw,
  Search,
  TableProperties,
  Target,
  UploadCloud,
  Users,
} from "lucide-react";
import ModuleHeader from "@/components/module-header";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function formatDate(value) {
  if (!value) return "ยังไม่มีประวัติการรัน";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PersonTargetDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadData({ isRefresh = false } = {}) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/person-target", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load person targets");
      setData(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data?.rows || [];
    return (data?.rows || []).filter((row) => (
      row.hospcode.toLowerCase().includes(term) || row.hospname.toLowerCase().includes(term)
    ));
  }, [data?.rows, searchTerm]);

  const summary = data?.summary;

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ประชากรแยกตาม TYPEAREA รายหน่วยบริการ จากตารางสรุป transform" />

        {error ? <div className="error">{error}</div> : null}

        <div className="statGrid personTargetStatGrid">
          <div className="statCard">
            <span className="statIcon"><Target aria-hidden="true" /></span>
            <span className="statValue">{loading ? "…" : formatNumber(summary?.targetPopulation)}</span>
            <span className="statLabel">Typearea 1 + 3</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><Building2 aria-hidden="true" /></span>
            <span className="statValue">{loading ? "…" : formatNumber(summary?.units)}</span>
            <span className="statLabel">หน่วยบริการ</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><Users aria-hidden="true" /></span>
            <span className="statValue">{loading ? "…" : formatNumber(summary?.type1)}</span>
            <span className="statLabel">Typearea 1</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><Target aria-hidden="true" /></span>
            <span className="statValue">{loading ? "…" : formatNumber(summary?.type3)}</span>
            <span className="statLabel">Typearea 3</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><Users aria-hidden="true" /></span>
            <span className="statValue">{loading ? "…" : formatNumber(summary?.totalPopulation)}</span>
            <span className="statLabel">ประชากรรวมทุก Typearea</span>
          </div>
        </div>

        <div className="personTargetToolbar">
          <label className="field personTargetSearch">
            <span className="srOnly">ค้นหาหน่วยบริการ</span>
            <div className="inputWithIcon">
              <Search aria-hidden="true" />
              <input
                className="fieldInput reportSearchInput"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อหรือรหัสหน่วยบริการ"
              />
            </div>
          </label>
          <button
            type="button"
            className="personTargetRefresh"
            onClick={() => loadData({ isRefresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw aria-hidden="true" className={refreshing ? "personTargetSpin" : ""} />
            รีเฟรช
          </button>
        </div>

        <div className="tableMeta personTargetMeta">
          <span><TableProperties aria-hidden="true" /> {loading ? "กำลังโหลดข้อมูล..." : `แสดง ${formatNumber(rows.length)} จาก ${formatNumber(summary?.units)} หน่วยบริการ`}</span>
          <span>Transform ล่าสุด: {formatDate(data?.transformedAt)}</span>
        </div>

        <div className="tableWrap personTargetTableWrap">
          <table className="fileTable personTargetTable">
            <thead>
              <tr>
                <th>#</th>
                <th>หน่วยบริการ</th>
                <th className="numCol type1Header">Type 1</th>
                <th className="numCol">Type 2</th>
                <th className="numCol type3Header">Type 3</th>
                <th className="numCol targetPopulationHeader">เป้าหมาย<br />(1+3)</th>
                <th className="numCol">Type 4</th>
                <th className="numCol">Type 5</th>
                <th className="numCol">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <tr key={row.hospcode}>
                  <td className="personTargetRank">{index + 1}</td>
                  <td className="fileCol">
                    {row.hospcode}
                    {row.hospname ? (
                      <span className="hospNameShort">{row.hospname}</span>
                    ) : null}
                  </td>
                  <td className="numCol type1Cell">{formatNumber(row.type1)}</td>
                  <td className="numCol">{formatNumber(row.type2)}</td>
                  <td className="numCol type3Cell">{formatNumber(row.type3)}</td>
                  <td className="numCol targetPopulationCell">{formatNumber(row.targetPopulation)}</td>
                  <td className="numCol">{formatNumber(row.type4)}</td>
                  <td className="numCol">{formatNumber(row.type5)}</td>
                  <td className="numCol personTargetTotal">{formatNumber(row.totalPopulation)}</td>
                </tr>
              )) : (
                <tr>
                  <td className="emptyCell" colSpan={9}>
                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูลกลุ่มเป้าหมาย"}
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
