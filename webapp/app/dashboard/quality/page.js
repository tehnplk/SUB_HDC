"use client";

import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

export default function QualityPortal() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ตรวจสอบคุณภาพ/ความถูกต้องของข้อมูล" />

        <ul className="moduleTopicList">
          <TopicBullet href="/quality/person-dup" topic="ประเภทการอยู่อาศัยซ้ำกันข้ามหน่วยบริการ (PERSON - TYPEAREA)" />
          <TopicBullet href="/quality/service-instype-err" topic="รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ (SERVICE - INSTYPE)" />
        </ul>
      </section>
    </div>
  );
}
