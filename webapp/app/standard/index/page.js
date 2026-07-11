import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const menuItems = [
  {
    href: "/standard/person-typearea",
    title: "ประชากรแยกตาม TYPEAREA",
    description: "สรุปประชากรรายหน่วยบริการ แยก Typearea 1–5 และกลุ่มเป้าหมาย Typearea 1+3",
  },
  {
    href: "/standard/person-pyramid",
    title: "ประชากรแยกช่วงอายุ 5 ปี",
    description: "ปิรามิดประชากรชาย–หญิง จาก Typearea 1 และ 3 โดยรวมช่วงอายุ 85 ปีขึ้นไป",
  },
  {
    href: "/standard/dm-ht-count",
    title: "จำนวนผู้ป่วย DM/HT",
    description: "ผู้ป่วยเบาหวาน/ความดันโลหิตสูงในเขต (Typearea 1+3) รายหน่วยบริการ จากการให้รหัสโรค",
  },
];

export default function StandardIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ข้อมูลมาตรฐานสำหรับตรวจสอบโครงสร้างประชากร" />

        <ul className="moduleTopicList">
          {menuItems.map(({ href, title, description }) => (
            <li key={href}>
              <Link href={href} className="moduleTopicLink">
              <span className="moduleTopicBullet" aria-hidden="true" />
              <span className="standardMenuText">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight className="standardMenuArrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
