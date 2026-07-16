import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const workloadItems = [
  {
    href: "/workload/visit-monthly",
    topic: "จำนวนให้บริการผู้ป่วยนอก",
  },
  {
    href: "/workload/ncdscreen-workload",
    topic: "การคัดกรองเบาหวานความดัน",
  },
];

export default function WorkloadPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ศูนย์รวมผลงานบริการสุขภาพรายหน่วยบริการ" />
        <ul className="moduleTopicList">
          {workloadItems.map(({ href, topic }) => (
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
