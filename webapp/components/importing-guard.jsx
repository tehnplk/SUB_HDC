"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

// Hook เช็คสถานะการนำเข้าจาก /api/import-status แล้ว poll ทุก 15 วิ ระหว่าง
// import เพื่อให้ banner หายเองเมื่อคิวจบ (ใช้ร่วมกันหน้า report / ai chat ที่
// query ตารางใหญ่ ต้อง block ระหว่าง import)
export function useImportingGuard() {
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch("/api/import-status", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        if (active) setImporting(Boolean(payload.importing));
      } catch {
        // network error ชั่วคราว — ไม่เปลี่ยนสถานะ ไม่ block การใช้งาน
      }
    }

    check();
    const timer = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return importing;
}

// Banner แจ้งเตือนระหว่างมีการนำเข้าข้อมูล (รูปแบบเดียวกับหน้า hos-list)
export function ImportingNotice() {
  return (
    <div className="importingNotice">
      <LoaderCircle aria-hidden="true" className="importingSpinner" />
      <div>
        <p className="importingTitle">กำลังมีการนำเข้าข้อมูล</p>
        <p className="importingText">
          ไม่สามารถแสดงผลได้ในขณะนี้ กรุณากลับมาอีกครั้งเมื่อการนำเข้าสิ้นสุด
        </p>
      </div>
    </div>
  );
}
