"use client";

import Link from "next/link";
import ModuleHeader from "@/components/module-header";

export default function QualityPortal() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ตรวจสอบคุณภาพ/ความถูกต้องของข้อมูล" />

        <ol className="qualityCheckList">
          <li>
            <Link href="/quality/person-dup">ประชากร TYPE 1 และ 3 ซ้ำกัน</Link>
          </li>
        </ol>
      </section>
    </div>
  );
}
