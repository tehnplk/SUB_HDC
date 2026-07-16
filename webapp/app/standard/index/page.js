import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

const menuItems = [
  {
    href: "/standard/person-typearea",
    topic: "ประชากรแยกตาม TYPEAREA",
  },
  {
    href: "/standard/person-pyramid",
    topic: "ประชากรแยกช่วงอายุ 5 ปี",
  },
];

export default function StandardIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ข้อมูลมาตรฐานสำหรับตรวจสอบโครงสร้างประชากร" />

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
