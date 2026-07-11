"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  LoaderCircle,
  TableProperties,
  UploadCloud,
  X,
} from "lucide-react";
import ModuleHeader from "@/components/module-header";
import { getFileTypeLabel, getMonthlyRowTotal } from "@/lib/dashboard-data.mjs";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function HosListDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFileQuery = searchParams.get("file") || "service";
  const selectedFiscalYearQuery = searchParams.get("fiscalYear") || "";
  const [selectedFile, setSelectedFile] = useState(selectedFileQuery);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(selectedFiscalYearQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // เพิ่มค่าทุกครั้งที่ต้อง fetch ซ้ำ (auto-poll ตอนกำลังนำเข้า) เพื่อให้ fetch
  // effect รันใหม่โดยไม่ต้องเปลี่ยน filter
  const [refreshTick, setRefreshTick] = useState(0);

  const PAGE_SIZE = 100;

  const [rawModal, setRawModal] = useState({
    open: false,
    loading: false,
    error: null,
    hospcode: null,
    monthLabel: null,
    monthValue: null,
    columns: [],
    rows: [],
    total: 0,
    page: 1,
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedFile) params.set("file", selectedFile);
    if (selectedFiscalYear) params.set("fiscalYear", selectedFiscalYear);
    return params.toString();
  }, [selectedFile, selectedFiscalYear]);

  function updateFilterQuery({ file, fiscalYear }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFile = file ?? selectedFile;
    const nextFiscalYear = fiscalYear ?? selectedFiscalYear;

    if (nextFile) params.set("file", nextFile);
    else params.delete("file");

    if (nextFiscalYear) params.set("fiscalYear", nextFiscalYear);
    else params.delete("fiscalYear");

    const nextQuery = params.toString();
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    setSelectedFile(selectedFileQuery);
    setSelectedFiscalYear(selectedFiscalYearQuery);
  }, [selectedFileQuery, selectedFiscalYearQuery]);

  useEffect(() => {
    if (searchParams.get("file")) return;
    updateFilterQuery({ file: "service", fiscalYear: selectedFiscalYearQuery });
  }, [searchParams, selectedFiscalYearQuery]);

  useEffect(() => {
    const controller = new AbortController();
    // poll (refreshTick > 0) ไม่ตั้ง loading เพื่อไม่ให้ banner กระพริบ
    const isPoll = refreshTick > 0;
    if (!isPoll) setLoading(true);
    setError(null);

    fetch(`/api/dashboard${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        if (selectedFile && !selectedFiscalYear) {
          const nextFiscalYear = payload.selectedFiscalYear || "";
          if (nextFiscalYear) updateFilterQuery({ file: selectedFile, fiscalYear: nextFiscalYear });
          else setSelectedFiscalYear("");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!isPoll) setLoading(false);
      });

    return () => controller.abort();
  }, [query, selectedFile, selectedFiscalYear, refreshTick]);

  // ระหว่างกำลังนำเข้า poll ซ้ำทุก 15 วิ เพื่อให้ banner หายเอง + ตารางโหลดขึ้น
  // อัตโนมัติเมื่อ import จบ โดยไม่ต้อง refresh มือ (query ที่ poll เป็นตัวเบา —
  // เช็ค log_import_file อย่างเดียว ไม่แตะตารางใหญ่)
  useEffect(() => {
    if (!data?.importing) return;
    const timer = setInterval(() => setRefreshTick((tick) => tick + 1), 15000);
    return () => clearInterval(timer);
  }, [data?.importing]);

  const importing = Boolean(data?.importing);
  const hasData = data && !error;
  const hasMonthly = Boolean(data?.hasMonthly);
  const rows = selectedFile ? data?.rows || [] : [];
  const months = data?.months || [];
  // ชื่อย่อหน่วยบริการ (hospcode → hospname_short) — ว่างได้ถ้าไซต์ยังไม่โหลด
  // lookup c_hospital ตารางจะแสดงแค่รหัสเหมือนเดิม
  const hospNames = data?.hospNames || {};

  function currentUrl() {
    const currentQuery = searchParams.toString();
    return `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  }

  function redirectToLogin() {
    router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl())}`);
  }

  async function canViewRawRecords() {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return false;
      const session = await res.json();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  }

  function formatCell(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  }

  function renderMonthlyCells(row) {
    const cells = months.map((month) => {
      const count = row[month.key];
      if (count > 0) {
        return (
          <td
            key={month.key}
            className="numCol monthCol clickableMonthCol"
            onClick={() => openRawModal(row.hospcode, month.key, month.label, month.value)}
          >
            {formatNumber(count)}
          </td>
        );
      }
      return (
        <td key={month.key} className="numCol monthCol">
          {formatNumber(count)}
        </td>
      );
    });
    const total = getMonthlyRowTotal(months, row);
    cells.push(
      total > 0 ? (
        <td
          key="total"
          className="numCol monthCol totalCol clickableMonthCol"
          onClick={() => openRawModal(row.hospcode, "total", null, null)}
        >
          {formatNumber(total)}
        </td>
      ) : (
        <td key="total" className="numCol monthCol totalCol">
          {formatNumber(total)}
        </td>
      )
    );
    return cells;
  }

  function fetchRawRecords(hospcode, monthValue, page) {
    setRawModal((s) => ({ ...s, loading: true, error: null, page }));
    let url =
      `/api/raw-records?file=${encodeURIComponent(selectedFile)}`
      + `&hospcode=${encodeURIComponent(hospcode)}`
      + `&fiscalYear=${encodeURIComponent(selectedFiscalYear)}`
      + `&page=${page}&limit=${PAGE_SIZE}`;
    if (monthValue) {
      url += `&monthValue=${encodeURIComponent(monthValue)}`;
    }
    fetch(url)
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (payload?.error === "Unauthorized") {
          closeRawModal();
          redirectToLogin();
          return;
        }
        if (!ok) throw new Error(payload.error || "Failed");
        setRawModal((s) => ({
          ...s,
          loading: false,
          columns: payload.columns,
          rows: payload.rows,
          total: payload.total,
        }));
      })
      .catch((err) =>
        setRawModal((s) => ({ ...s, loading: false, error: err.message }))
      );
  }

  async function openRawModal(hospcode, monthKey, monthLabel, monthValue) {
    if (!(await canViewRawRecords())) {
      redirectToLogin();
      return;
    }

    setRawModal({
      open: true,
      loading: true,
      error: null,
      hospcode,
      monthLabel: monthLabel || null,
      monthValue: monthValue || null,
      columns: [],
      rows: [],
      total: 0,
      page: 1,
    });
    fetchRawRecords(hospcode, monthValue || null, 1);
  }

  function closeRawModal() {
    setRawModal((s) => ({ ...s, open: false }));
  }

  function goRawPage(dir) {
    const next = rawModal.page + dir;
    if (next < 1) return;
    fetchRawRecords(rawModal.hospcode, rawModal.monthValue || null, next);
  }

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="จำนวนข้อมูลแต่ละแฟ้ม แยกตาม HOSCODE" />

        {error ? <div className="error">{error}</div> : null}

        {importing ? (
          <div className="importingNotice">
            <LoaderCircle aria-hidden="true" className="importingSpinner" />
            <div>
              <p className="importingTitle">กำลังมีการนำเข้าข้อมูล</p>
              <p className="importingText">
                ไม่สามารถแสดงผลได้ในขณะนี้ กรุณากลับมาอีกครั้งเมื่อการนำเข้าสิ้นสุด
              </p>
            </div>
          </div>
        ) : null}

        <div className="filterGrid" hidden={importing}>
          <label className="field">
            <span>
              <FileText aria-hidden="true" />
              ชื่อแฟ้ม
            </span>
            <select
              value={selectedFile}
              disabled={!hasData || loading}
              onChange={(event) => {
                const nextFile = event.target.value;
                setSelectedFile(nextFile);
                setSelectedFiscalYear("");
                updateFilterQuery({ file: nextFile, fiscalYear: "" });
              }}
            >
              <option value="" disabled>เลือกแฟ้ม</option>
              {(data?.files || []).map((file) => (
                <option key={file.fileName} value={file.fileName}>
                  {file.fileName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              <CalendarDays aria-hidden="true" />
              ปีงบประมาณ
            </span>
            <select
              value={selectedFiscalYear}
              disabled={!hasData || loading || !hasMonthly}
              onChange={(event) => {
                const nextFiscalYear = event.target.value;
                setSelectedFiscalYear(nextFiscalYear);
                updateFilterQuery({ file: selectedFile, fiscalYear: nextFiscalYear });
              }}
            >
              {hasMonthly ? (
                <>
                  <option value="" disabled>เลือกปีงบประมาณ</option>
                  {data.fiscalYears.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">ไม่มี date_serv/date_admit/datetime_admit/datetime_serv</option>
              )}
            </select>
          </label>
        </div>

        <div className="statGrid statGridCompact" hidden={importing}>
          <div className="statCard">
            <span className="statIcon"><Database aria-hidden="true" /></span>
            <span className="statValue">{formatNumber(data?.totalRows)}</span>
            <span className="statLabel">จำนวนรวม</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><Building2 aria-hidden="true" /></span>
            <span className="statValue">{formatNumber(rows.length)}</span>
            <span className="statLabel">HOSCODE</span>
          </div>
          <div className="statCard">
            <span className="statIcon"><CalendarDays aria-hidden="true" /></span>
            <span className="statValue">{hasMonthly ? data?.dateColumn : "รวม"}</span>
            <span className="statLabel">รูปแบบข้อมูล</span>
          </div>
        </div>

        <div className="tableMeta metaLine" hidden={importing}>
          <TableProperties aria-hidden="true" />
          {loading ? "กำลังโหลด..." : getFileTypeLabel(hasMonthly)}
        </div>

        <div className="tableWrap monthlyTableWrap" hidden={importing}>
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
                    <td className="fileCol">
                      {row.hospcode}
                      {hospNames[row.hospcode] ? (
                        <span className="hospNameShort">{hospNames[row.hospcode]}</span>
                      ) : null}
                    </td>
                    {hasMonthly ? (
                      renderMonthlyCells(row)
                    ) : (
                      row.total > 0 ? (
                        <td
                          className="numCol clickableMonthCol"
                          onClick={() => openRawModal(row.hospcode, "total", null, null)}
                        >
                          {formatNumber(row.total)}
                        </td>
                      ) : (
                        <td className="numCol">{formatNumber(row.total)}</td>
                      )
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="emptyCell" colSpan={hasMonthly ? months.length + 2 : 2}>
                    <span className="emptyState">
                      {loading ? <LoaderCircle aria-hidden="true" /> : <TableProperties aria-hidden="true" />}
                      {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {rawModal.open ? (
        <div className="reportModalBackdrop" role="presentation" onClick={closeRawModal}>
          <section
            className="reportModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="raw-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ overflow: "auto" }}
          >
            <div className="reportModalHeader">
              <div>
                <h2 id="raw-modal-title">
                  {selectedFile} — {rawModal.hospcode}
                  {hospNames[rawModal.hospcode] ? ` ${hospNames[rawModal.hospcode]}` : ""}
                  {rawModal.monthLabel ? ` — ${rawModal.monthLabel}` : " — ทั้งปี"}
                </h2>
                <p>
                  {rawModal.loading
                    ? "กำลังโหลด..."
                    : `${rawModal.total.toLocaleString()} รายการ`}
                </p>
              </div>
              <button type="button" className="reportModalClose" onClick={closeRawModal} aria-label="ปิด">
                <X aria-hidden="true" />
              </button>
            </div>

            {rawModal.error ? <div className="error">{rawModal.error}</div> : null}

            <div className="tableWrap reportResultWrap" style={{ maxHeight: "420px" }}>
              <table className="fileTable">
                <thead>
                  <tr>
                    {rawModal.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawModal.loading ? (
                    <tr>
                      <td className="emptyCell" colSpan={rawModal.columns.length || 1}>
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : rawModal.rows.length ? (
                    rawModal.rows.map((row, i) => (
                      <tr key={i}>
                        {rawModal.columns.map((col) => (
                          <td key={col}>{formatCell(row[col])}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="emptyCell" colSpan={rawModal.columns.length || 1}>
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {rawModal.total > PAGE_SIZE ? (
              <div className="pagination">
                <button disabled={rawModal.page <= 1} onClick={() => goRawPage(-1)}>
                  <ChevronLeft aria-hidden="true" />
                  ก่อน
                </button>
                <span>
                  หน้า {rawModal.page} / {Math.ceil(rawModal.total / PAGE_SIZE)}
                </span>
                <button
                  disabled={rawModal.page >= Math.ceil(rawModal.total / PAGE_SIZE)}
                  onClick={() => goRawPage(1)}
                >
                  ถัดไป
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
