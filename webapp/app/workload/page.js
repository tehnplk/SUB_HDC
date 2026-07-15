import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const workloadItems = [
  {
    href: "/workload/visit-monthly",
    title: "จำนวนให้บริการผู้ป่วยนอก",
    description: "แสดงจำนวนการรับบริการผู้ป่วยนอกรายหน่วยบริการ แยกตามเดือน",
  },
  {
    href: "/workload/ncdscreen-workload",
    title: "การคัดกรองเบาหวานความดัน",
    description: "ติดตามผลงานรายหน่วยบริการ และแนวโน้มผลรวมรายเดือนของประชากร Typearea 1 หรือ 3",
  },
];

export default function WorkloadPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ศูนย์รวมผลงานบริการสุขภาพรายหน่วยบริการ" />
        <ul className="moduleTopicList">
          {workloadItems.map(({ href, title, description }) => (
            <li key={href}>
              <Link href={href} className="moduleTopicLink">
                <span className="moduleTopicBullet" aria-hidden="true" />
                <span className="standardMenuText"><strong>{title}</strong><small>{description}</small></span>
                <ChevronRight className="standardMenuArrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
