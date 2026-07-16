"use client";

import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

export default function QualityPortal() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ตรวจสอบคุณภาพ/ความถูกต้องของข้อมูล" />

        <ul className="moduleTopicList">
          <TopicBullet href="/quality/person-dup" topic="ประชากร TYPE 1 และ 3 ซ้ำกัน" />
          <TopicBullet href="/quality/service-instype-err" topic="รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ" />
        </ul>
      </section>
    </div>
  );
}
