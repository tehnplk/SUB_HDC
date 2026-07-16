"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

export default function QualityPortal() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ตรวจสอบคุณภาพ/ความถูกต้องของข้อมูล" />

        <ul className="moduleTopicList">
          <li>
            <Link href="/quality/person-dup" className="moduleTopicLink">
              <span className="moduleTopicBullet" aria-hidden="true" />
              <span className="moduleTopicText">ประชากร TYPE 1 และ 3 ซ้ำกัน</span>
              <ChevronRight className="standardMenuArrow" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
