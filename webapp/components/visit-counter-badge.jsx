"use client";

import { useEffect, useState } from "react";

// นับหนึ่งครั้งต่อ session ของแท็บ (sessionStorage) — flag คงอยู่ข้าม
// reload/refresh จึงไม่นับซ้ำ; ปิดแท็บแล้วเปิดใหม่ = session ใหม่ นับใหม่
// (ครอบ remount ตอนเปลี่ยนหน้าแบบ SPA ด้วย เพราะ flag ยังอยู่)
const VISIT_SESSION_KEY = "visitCounted";

// badge แสดงจำนวนผู้เข้าใช้ ต่อท้าย connect status ในแถวชื่อระบบ
export default function VisitCounterBadge() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let active = true;
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(VISIT_SESSION_KEY) === "1";
      sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    } catch {
      // sessionStorage ถูกปิด (private mode เข้ม) — ปล่อยให้นับตามปกติ
    }
    const method = alreadyCounted ? "GET" : "POST";
    fetch("/api/visit-counter", { method, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload && typeof payload.total === "number") setTotal(payload.total);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (total === null) return null;

  return (
    <span className="visitCounterBadge">
      จำนวนผู้เข้าใช้ {total.toLocaleString("th-TH")} ครั้ง
    </span>
  );
}
