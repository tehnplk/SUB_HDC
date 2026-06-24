"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="main">
        <section className="panel">
          <div className="loading">กำลังโหลด...</div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main">
        <section className="panel">
          <div className="error">{error}</div>
        </section>
      </div>
    );
  }

  const { hospcode, totalFiles, filesWithData, totalRows, files } = data;

  return (
    <div className="main">
      <section className="panel panelWide">
        <div className="headerRow">
          <div>
            <p className="eyebrow">SUB HDC</p>
            <h1>Dashboard</h1>
            <p className="lead">
              HOSPC: {hospcode}
            </p>
          </div>
          <Link href="/upload" className="navLink">
            ⬆ นำเข้าไฟล์
          </Link>
        </div>

        <div className="statGrid">
          <div className="statCard">
            <span className="statValue">{totalFiles}</span>
            <span className="statLabel">ไฟล์ทั้งหมด</span>
          </div>
          <div className="statCard">
            <span className="statValue">{filesWithData}</span>
            <span className="statLabel">มีข้อมูล</span>
          </div>
          <div className="statCard">
            <span className="statValue">{totalRows.toLocaleString()}</span>
            <span className="statLabel">แถวทั้งหมด</span>
          </div>
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
              {files.map((f) => (
                <tr key={f.filename} className={f.row_count === 0 ? "emptyRow" : ""}>
                  <td className="fileCol">{f.filename}</td>
                  <td className="numCol">{f.row_count.toLocaleString()}</td>
                  <td>
                    <span className={`dot ${f.row_count > 0 ? "dotGreen" : "dotGray"}`} />
                    {f.row_count > 0 ? "มีข้อมูล" : "ว่าง"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
