"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, RefreshCw, TableProperties, Users } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import HospitalFilter from "@/components/hospital-filter";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function ageStart(ageRange) {
  const match = String(ageRange || "").match(/^\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  if (!value) return "ยังไม่มีประวัติการรัน";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function PersonPyramidPage() {
  const [data, setData] = useState(null);
  const [selectedHospcode, setSelectedHospcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadData({ isRefresh = false } = {}) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/person-pyramid", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load population pyramid");
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

  const hospcodes = useMemo(() => Array.from(new Map((data?.rows || []).map((row) => [
    row.hospcode,
    row.hospname ? `${row.hospcode} — ${row.hospname}` : row.hospcode,
  ])).entries()), [data?.rows]);

  const rows = useMemo(() => {
    const grouped = new Map();
    for (const row of data?.rows || []) {
      if (selectedHospcode && row.hospcode !== selectedHospcode) continue;
      const current = grouped.get(row.ageRange) || { ageRange: row.ageRange, male: 0, female: 0 };
      current.male += row.male;
      current.female += row.female;
      grouped.set(row.ageRange, current);
    }
    return [...grouped.values()].sort((left, right) => ageStart(left.ageRange) - ageStart(right.ageRange));
  }, [data?.rows, selectedHospcode]);

  const maxPopulation = Math.max(1, ...rows.flatMap((row) => [row.male, row.female]));
  const totalMale = rows.reduce((total, row) => total + row.male, 0);
  const totalFemale = rows.reduce((total, row) => total + row.female, 0);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ประชากร Typearea 1 และ 3 แยกชาย–หญิงตามช่วงอายุ 5 ปี" />
        {error ? <div className="error">{error}</div> : null}

        <div className="pyramidToolbar">
          <HospitalFilter
            value={selectedHospcode}
            onChange={setSelectedHospcode}
            hospitals={hospcodes.map(([hospcode, label]) => ({ hospcode, hospname: label.replace(`${hospcode} — `, "") }))}
            disabled={loading}
            className="field pyramidSelect"
          />
          <button type="button" className="personTargetRefresh" onClick={() => loadData({ isRefresh: true })} disabled={loading || refreshing}>
            <RefreshCw aria-hidden="true" className={refreshing ? "personTargetSpin" : ""} />รีเฟรช
          </button>
        </div>

        <div className="statGrid pyramidStatGrid">
          <div className="statCard"><span className="statIcon"><Building2 aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(selectedHospcode ? 1 : hospcodes.length)}</span><span className="statLabel">หน่วยบริการ</span></div>
          <div className="statCard"><span className="statIcon"><Users aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(totalMale)}</span><span className="statLabel">ชาย</span></div>
          <div className="statCard"><span className="statIcon"><Users aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(totalFemale)}</span><span className="statLabel">หญิง</span></div>
          <div className="statCard"><span className="statIcon"><BarChart3 aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(totalMale + totalFemale)}</span><span className="statLabel">ประชากรรวม</span></div>
        </div>

        <section className="pyramidChart" aria-label="ปิรามิดประชากร">
          <div className="pyramidLegend"><span className="pyramidMaleLegend">ชาย</span><span>ช่วงอายุ</span><span className="pyramidFemaleLegend">หญิง</span></div>
          {rows.length ? rows.slice().reverse().map((row) => (
            <div key={row.ageRange} className="pyramidRow">
              <div className="pyramidBarSide pyramidMaleSide"><span style={{ width: `${(row.male / maxPopulation) * 100}%` }} title={`ชาย ${formatNumber(row.male)}`} /></div>
              <span className="pyramidAge">{row.ageRange}</span>
              <div className="pyramidBarSide pyramidFemaleSide"><span style={{ width: `${(row.female / maxPopulation) * 100}%` }} title={`หญิง ${formatNumber(row.female)}`} /></div>
            </div>
          )) : <p className="pyramidEmpty">{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูลปิรามิดประชากร"}</p>}
        </section>

        <div className="tableMeta personTargetMeta"><span><TableProperties aria-hidden="true" /> ช่วงอายุ 5 ปี: 0-4 ถึง 80-84 และ 85+</span><span>Transform ล่าสุด: {formatDate(data?.transformedAt)}</span></div>
        <div className="tableWrap personTargetTableWrap">
          <table className="fileTable personTargetTable"><thead><tr><th>ช่วงอายุ</th><th className="numCol">ชาย</th><th className="numCol">หญิง</th><th className="numCol">รวม</th></tr></thead>
            <tbody>{rows.length ? rows.map((row) => <tr key={row.ageRange}><td className="fileCol">{row.ageRange}</td><td className="numCol">{formatNumber(row.male)}</td><td className="numCol">{formatNumber(row.female)}</td><td className="numCol personTargetTotal">{formatNumber(row.male + row.female)}</td></tr>) : <tr><td className="emptyCell" colSpan={4}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
