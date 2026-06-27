"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, TableProperties, UsersRound } from "lucide-react";

const PAGE_SIZE = 50;

const COLUMNS = ["hospcode", "pid", "name", "lname"];

export default function PersonPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/person?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="main"><section className="panel"><div className="loading">กำลังโหลด...</div></section></div>;
  if (error) return <div className="main"><section className="panel"><div className="error">{error}</div></section></div>;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  const centerSuffix = data?.centerName ? ` ${data.centerName}` : "";

  return (
    <div className="main">
      <section className="panel panelWide">
        <div className="headerRow">
          <div className="titleRow">
            <span className="iconBadge">
              <UsersRound aria-hidden="true" />
            </span>
            <div className="titleText">
              <h4 className="pageHeaderTitle">SUB-HDC{centerSuffix}</h4>
              <h1 style={{ fontSize: "28px", margin: "0 0 10px" }}>PERSON</h1>
              <p className="lead">{data.total.toLocaleString()} รายการ</p>
            </div>
          </div>
          <Link href="/" className="navLink">
            <ArrowLeft aria-hidden="true" />
            แดชบอร์ด
          </Link>
        </div>

        <div className="tableMeta metaLine">
          <TableProperties aria-hidden="true" />
          PERSON rows {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, data.total)} / {data.total.toLocaleString()}
        </div>

        <div className="tableWrap" style={{ maxHeight: "70vh" }}>
          <table className="fileTable">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {COLUMNS.map((col) => (
                    <td key={col} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft aria-hidden="true" />
              ก่อน
            </button>
            <span>หน้า {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              ถัดไป
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
