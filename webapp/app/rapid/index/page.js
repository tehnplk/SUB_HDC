import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";
import { RAPID_MENU } from "../_lib/rapid-reports.mjs";

// แต่ละหัวข้อลิงก์ไป /rapid/{report_id} — ชื่อใช้เดียวกับ report.name (RAPID_REPORTS[id].title)
const menuItems = RAPID_MENU;

export default function RapidIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="งานเร่งรัดติดตามรายตัวชี้วัด" />

        <ul className="moduleTopicList moduleTopicListCompact">
          {menuItems.map(({ id, title }) => (
            <li key={id}>
              <Link href={`/rapid/${id}`} className="moduleTopicLink">
                <span className="moduleTopicBullet" aria-hidden="true" />
                <span className="standardMenuText">
                  <strong>{title}</strong>
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
