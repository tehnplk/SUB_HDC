import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const menuItems = [
  {
    href: "/import-check/log-import",
    title: "ประวัติการนำเข้า",
    description: "ติดตามสถานะคิว รายการนำเข้า และรายละเอียดข้อผิดพลาดของไฟล์ข้อมูล",
  },
  {
    href: "/import-check/hos-list",
    title: "รายหน่วยงาน",
    description: "ตรวจจำนวนข้อมูลแต่ละแฟ้ม แยกตามหน่วยบริการและปีงบประมาณ",
  },
];

export default function ImportCheckIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ตรวจสอบความพร้อมและผลการนำเข้าข้อมูล" />

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
