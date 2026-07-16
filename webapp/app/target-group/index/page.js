import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const menuItems = [
  {
    href: "/target-group/kpi",
    topic: "กลุ่มเป้าหมายตามตัวชี้วัด",
  },
  {
    href: "#",
    topic: "กลุ่มเป้าหมายการจัดเก็บรายได้",
  },
];

export default function TargetGroupIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ทะเบียนกลุ่มเป้าหมายรายคนสำหรับติดตามงาน" />

        <ul className="moduleTopicList">
          {menuItems.map(({ href, topic }) => (
            <li key={topic}>
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
