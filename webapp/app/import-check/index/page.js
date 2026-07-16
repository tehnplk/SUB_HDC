import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const menuItems = [
  {
    href: "/import-check/log-import",
    topic: "ประวัติการนำเข้า",
  },
  {
    href: "/import-check/files-count",
    topic: "จำนวนข้อมูลรายแฟ้ม",
  },
  {
    href: "/import-check/compare-hdc-person",
    topic: "เปรียบเทียบประชากรกับ HDC",
  },
];

export default function ImportCheckIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ตรวจสอบความพร้อมและผลการนำเข้าข้อมูล" />

        <ul className="moduleTopicList">
          {menuItems.map(({ href, topic }) => (
            <li key={href}>
              <Link href={href} className="moduleTopicLink">
                <span className="moduleTopicBullet" aria-hidden="true" />
                <span className="moduleTopicText">{topic}</span>
                <ChevronRight className="standardMenuArrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
