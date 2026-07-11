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
    href: "/import-check/files-count",
    title: "จำนวนข้อมูลรายแฟ้ม",
    description: "ตรวจจำนวนข้อมูลแต่ละแฟ้ม แยกตามหน่วยบริการและปีงบประมาณ",
  },
  {
    href: "/import-check/compare-hdc-person",
    title: "เปรียบเทียบประชากรกับ HDC",
    description: "เทียบจำนวนประชากรแยก TYPEAREA ระหว่าง HDC กับ SUB-HDC รายหน่วยบริการ",
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
