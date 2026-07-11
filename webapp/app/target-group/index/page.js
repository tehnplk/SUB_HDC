import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

// ยังไม่มีหน้าปลายทาง — href "#" ไว้ก่อน เปิดใช้จริงค่อยเปลี่ยนเป็น route
const menuItems = [
  {
    href: "#",
    title: "กลุ่มเป้าหมายตามตัวชี้วัด",
    description: "ทะเบียนรายคนของกลุ่มเป้าหมายที่ใช้นับตัวชี้วัด",
  },
  {
    href: "#",
    title: "กลุ่มเป้าหมายการจัดเก็บรายได้",
    description: "ทะเบียนรายคนของกลุ่มเป้าหมายสำหรับงานจัดเก็บรายได้",
  },
];

export default function TargetGroupIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="ทะเบียนกลุ่มเป้าหมายรายคนสำหรับติดตามงาน" />

        <ul className="moduleTopicList">
          {menuItems.map(({ href, title, description }) => (
            <li key={title}>
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
