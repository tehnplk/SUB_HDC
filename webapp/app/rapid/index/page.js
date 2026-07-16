import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import { RAPID_MENU } from "../_lib/rapid-reports.mjs";

// แต่ละหัวข้อลิงก์ไปหน้า (route) ของ report นั้น ๆ ผ่าน href ที่กำหนดใน RAPID_MENU
const menuItems = RAPID_MENU;

export default function RapidIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="งานเร่งรัดติดตามรายตัวชี้วัด" />

        <ul className="moduleTopicList">
          {menuItems.map(({ id, href, title }) => (
            <li key={id}>
              <Link href={href} className="moduleTopicLink">
                <span className="moduleTopicBullet" aria-hidden="true" />
                <span className="moduleTopicText">{title}</span>
                <ChevronRight className="standardMenuArrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
