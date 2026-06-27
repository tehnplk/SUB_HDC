"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileStack, TableProperties, UploadCloud } from "lucide-react";
import DashboardHeaderImage from "@/components/dashboard-header-image";
import DashboardPageTitle from "@/components/dashboard-page-title";
import DashboardTabs from "@/components/dashboard-tabs";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function FileListDashboard() {
  const [data, setData] = useState(null);
  const [selectedHospcode, setSelectedHospcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ summary: "true" });
    if (selectedHospcode) params.set("hospcode", selectedHospcode);

    setLoading(true);
    setError(null);

    fetch(`/api/dashboard?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        setSelectedHospcode(payload.selectedHospcode || "");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedHospcode]);

  const hasData = data && !error;
  const files = data?.files || [];
  const hospcodes = data?.hospcodes || [];

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <DashboardHeaderImage />
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

        <div className="filterGrid" style={{ gridTemplateColumns: "minmax(220px, 320px)" }}>
          <div className="field">
            <select
              id="file-list-hospcode"
              name="hospcode"
              aria-label="hospcode"
              value={selectedHospcode}
              disabled={!hasData || loading}
              onChange={(event) => setSelectedHospcode(event.target.value)}
            >
              <option value="">หน่วยบริการทั้งหมด</option>
              {hospcodes.map((hospcode) => (
                <option key={hospcode} value={hospcode}>
                  {hospcode}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          {loading ? "กำลังโหลด..." : "สรุปข้อมูลสะสมแยกตามแฟ้ม"}
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th className="numCol">#</th>
                <th>แฟ้ม</th>
                <th className="numCol">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {files.length ? (
                files.map((file, index) => (
                  <tr key={file.filename} className={file.row_count === 0 ? "emptyRow" : ""}>
                    <td className="numCol">{index + 1}</td>
                    <td className="fileCol">
                      <span className="tableCellIcon">
                        <FileStack aria-hidden="true" />
                        {file.filename}
                      </span>
                    </td>
                    <td className="numCol">{formatNumber(file.row_count)}</td>
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
