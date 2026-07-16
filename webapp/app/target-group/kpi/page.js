"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  FileSpreadsheet,
  HeartPulse,
  RefreshCw,
  Search,
  TableProperties,
  Users,
} from "lucide-react";
import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

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

export function DmHtCountDashboard() {
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
      const response = await fetch("/api/dm-ht-count", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load DM/HT counts");
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
        <ModuleHeader subtitle="จำนวนผู้ป่วย DM/HT ในเขต (Typearea 1+3) รายหน่วยบริการ จากการให้รหัสโรค" />

        {error ? <div className="error">{error}</div> : null}

        <div className="statGrid personTargetStatGrid">
          <div className="statCard"><span className="statIcon"><Users aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(summary?.patients)}</span><span className="statLabel">ผู้ป่วยรวม (คน)</span></div>
          <div className="statCard"><span className="statIcon"><Activity aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(summary?.dmOnly)}</span><span className="statLabel">DM อย่างเดียว</span></div>
          <div className="statCard"><span className="statIcon"><HeartPulse aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(summary?.htOnly)}</span><span className="statLabel">HT อย่างเดียว</span></div>
          <div className="statCard"><span className="statIcon"><Activity aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(summary?.dmHt)}</span><span className="statLabel">DM ร่วม HT</span></div>
          <div className="statCard"><span className="statIcon"><Building2 aria-hidden="true" /></span><span className="statValue">{loading ? "…" : formatNumber(summary?.units)}</span><span className="statLabel">หน่วยบริการ</span></div>
        </div>

        <div className="personTargetToolbar">
          <label className="field personTargetSearch"><span className="srOnly">ค้นหาหน่วยบริการ</span><div className="inputWithIcon"><Search aria-hidden="true" /><input className="fieldInput reportSearchInput" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาชื่อหรือรหัสหน่วยบริการ" /></div></label>
          <button type="button" className="personTargetRefresh" onClick={() => loadData({ isRefresh: true })} disabled={loading || refreshing}><RefreshCw aria-hidden="true" className={refreshing ? "personTargetSpin" : ""} />รีเฟรช</button>
        </div>

        <div className="tableMeta personTargetMeta"><span><TableProperties aria-hidden="true" /> {loading ? "กำลังโหลดข้อมูล..." : "ขึ้นทะเบียนตาม TYPEAREA 1 และ 3"}</span><span>Transform ล่าสุด: {formatDate(data?.transformedAt)}</span></div>

        <div className="tableWrap personTargetTableWrap">
          <table className="fileTable personTargetTable">
            <thead><tr><th>#</th><th>หน่วยบริการ</th><th className="numCol">DM อย่างเดียว</th><th className="numCol">HT อย่างเดียว</th><th className="numCol">DM ร่วม HT</th><th className="numCol targetPopulationHeader">ผู้ป่วยรวม</th><th className="exportCol">รายชื่อแบบปกปิด</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <tr key={row.hospcode}>
                  <td className="personTargetRank">{index + 1}</td>
                  <td className="fileCol">{row.hospcode}{row.hospname ? <span className="hospNameShort">{row.hospname}</span> : null}</td>
                  <td className="numCol">{formatNumber(row.dmOnly)}</td><td className="numCol">{formatNumber(row.htOnly)}</td><td className="numCol">{formatNumber(row.dmHt)}</td><td className="numCol targetPopulationCell">{formatNumber(row.patients)}</td>
                  <td className="exportCol"><a className="exportXlsxLink" href={`/api/dm-ht-count/export?hospcode=${encodeURIComponent(row.hospcode)}`} title={`ส่งออกทะเบียน DM/HT ${row.hospcode} เป็น xlsx`} aria-label={`ส่งออกทะเบียน DM/HT ${row.hospcode} เป็น xlsx`}><FileSpreadsheet aria-hidden="true" /></a></td>
                </tr>
              )) : <tr><td className="emptyCell" colSpan={7}>{loading ? "กำลังโหลดข้อมูล..." : "ไม่พบทะเบียนผู้ป่วย DM/HT"}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function TargetGroupKpiIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ทะเบียนกลุ่มเป้าหมายตามตัวชี้วัด" />

        <ul className="moduleTopicList">
          <TopicBullet href="/target-group/kpi/dm-ht" topic="จำนวนผู้ป่วย DM/HT" />
        </ul>
      </section>
    </div>
  );
}
