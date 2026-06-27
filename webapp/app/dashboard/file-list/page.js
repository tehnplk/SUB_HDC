"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  FileStack,
  TableProperties,
  UploadCloud,
} from "lucide-react";
import DashboardPageTitle from "@/components/dashboard-page-title";
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

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <span className="iconBadge">
              <FileStack aria-hidden="true" />
            </span>
            <div className="titleText">
              <DashboardPageTitle />
              <p className="lead">จำนวนข้อมูลสะสมในระบบแยกตามรายแฟ้ม</p>
            </div>
          </div>
          <Link href="/upload" className="navLink">
            <UploadCloud aria-hidden="true" />
            นำเข้าไฟล์
          </Link>
        </div>

        <DashboardTabs />

        {error ? <div className="error">{error}</div> : null}

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          {loading ? "กำลังโหลด..." : "สรุปข้อมูลสะสมแยกตามแฟ้ม"}
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <tbody>
              {files.length ? (
                files.map((f) => (
                  <tr key={f.filename} className={f.row_count === 0 ? "emptyRow" : ""}>
                    <td className="fileCol">
                      <span className="tableCellIcon">
                        <FileStack aria-hidden="true" />
                        {f.filename}
                      </span>
                    </td>
                    <td className="numCol">{formatNumber(f.row_count)}</td>
                    <td>
                      <span className={`statusCell ${f.row_count > 0 ? "statusOk" : "statusMuted"}`}>
                        {f.row_count > 0 ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                        {f.row_count > 0 ? "มีข้อมูล" : "ว่าง"}
                      </span>
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
