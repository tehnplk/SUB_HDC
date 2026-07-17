"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

// สถานะร่วมของทุกหน้า /rapid — โหลดข้อมูล report จาก API, กรองสังกัด + sort ผ่าน
// query string (?aff=&sort=&dir=), สรุปยอดรวม, และ handler ดาวน์โหลดรายคน
// แต่ละหน้าเขียน UI (ตาราง/คอลัมน์) ของตัวเอง แต่ใช้ hook นี้ร่วมกัน
export function useRapidReport(reportId) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rapid/${reportId}`, { cache: "no-store" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
        setData(payload);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  // อัปเดต query string หนึ่งพารามิเตอร์ (ค่าว่าง = ลบทิ้ง)
  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // อำเภอ fix จาก .env AMP_CODE (API filter มาแล้ว); สังกัดกรองด้วย query string
  const affiliation = searchParams.get("aff") || "";
  const allRows = data?.rows || [];
  const affiliations = useMemo(
    () => [...new Set(allRows.map((row) => row.affiliation).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [allRows]
  );
  const filteredRows = useMemo(
    () => (affiliation ? allRows.filter((row) => row.affiliation === affiliation) : allRows),
    [allRows, affiliation]
  );

  // สถานะ sort จาก query string — default เรียงตาม hospcode
  const sortKey = searchParams.get("sort") || "hospcode";
  const sortDir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  function toggleSort(key) {
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", nextDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const summary = useMemo(() => {
    const target = filteredRows.reduce((sum, row) => sum + row.target, 0);
    const result = filteredRows.reduce((sum, row) => sum + row.result, 0);
    const control = filteredRows.reduce((sum, row) => sum + row.control, 0);
    return {
      units: filteredRows.length,
      target,
      result,
      control,
      screenPercent: target > 0 ? (control / target) * 100 : 0,
      controlPercent: target > 0 ? (result / target) * 100 : 0,
      unexamined: target - control,
      percent: target > 0 ? (result / target) * 100 : 0,
      deficit: target - result,
    };
  }, [filteredRows]);

  // คลิกส่วนขาด → ดาวน์โหลดรายชื่อรายคน (ยังไม่มีข้อมูล PERSON ครบ → แจ้งเตือน)
  function downloadIndividual() {
    Swal.fire({
      icon: "info",
      title: "ยังดาวน์โหลดไม่ได้",
      text: "ข้อมูล PERSON ในระบบ SUB-HDC ของหน่วยบริการนี้ยังไม่ครบ",
      confirmButtonText: "รับทราบ",
    });
  }

  return {
    data,
    loading,
    error,
    affiliation,
    affiliations,
    setParam,
    filteredRows,
    summary,
    sortKey,
    sortDir,
    toggleSort,
    downloadIndividual,
  };
}
