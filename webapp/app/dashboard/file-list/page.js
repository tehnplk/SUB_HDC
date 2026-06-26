"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardTabs from "@/components/dashboard-tabs";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function FileListDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/dashboard?summary=true", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const hasData = data && !error;
  const files = data?.files || [];

  const centerSuffix = data?.centerName ? ` ${data.centerName}` : "";

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div>
            <h4 className="pageHeaderTitle">SUB-HDC{centerSuffix}</h4>
            <p className="lead">จำนวนข้อมูลสะสมในระบบแยกตามรายแฟ้ม</p>
          </div>
          <Link href="/upload" className="navLink">
            นำเข้าไฟล์
          </Link>
        </div>

        <DashboardTabs />

        {error ? <div className="error">{error}</div> : null}

        <div className="statGrid">
          <div className="statCard">
            <span className="statValue">{loading ? "..." : formatNumber(data?.totalFiles)}</span>
            <span className="statLabel">ไฟล์ทั้งหมด</span>
          </div>
          <div className="statCard">
            <span className="statValue">{loading ? "..." : formatNumber(data?.filesWithData)}</span>
            <span className="statLabel">มีข้อมูล</span>
          </div>
          <div className="statCard">
            <span className="statValue">{loading ? "..." : formatNumber(data?.totalRows)}</span>
            <span className="statLabel">แถวทั้งหมด</span>
          </div>
        </div>

        <div className="tableMeta">
          {loading ? "กำลังโหลด..." : "สรุปข้อมูลสะสมแยกตามแฟ้ม"}
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th>ไฟล์</th>
                <th className="numCol">จำนวนแถว</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {files.length ? (
                files.map((f) => (
                  <tr key={f.filename} className={f.row_count === 0 ? "emptyRow" : ""}>
                    <td className="fileCol">{f.filename}</td>
                    <td className="numCol">{formatNumber(f.row_count)}</td>
                    <td>
                      <span className={`dot ${f.row_count > 0 ? "dotGreen" : "dotGray"}`} />
                      {f.row_count > 0 ? "มีข้อมูล" : "ว่าง"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={3}>
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
