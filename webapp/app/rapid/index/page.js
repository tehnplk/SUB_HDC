import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ModuleHeader from "@/components/module-header";

// ยังไม่มีหน้าปลายทาง — href "#" ไว้ก่อน เปิดใช้จริงค่อยเปลี่ยนเป็น route
const menuItems = [
  "ผู้ป่วยโรคเบาหวานควบคุมระดับน้ำตาลได้ดี (DM Control)",
  "ความครอบคลุมวัคซีนป้องกันหัด-คางทูม-หัดเยอรมัน เข็มที่ 2 (MMR2)",
  "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคความดันโลหิตสูง",
  "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน",
];

export default function RapidIndexPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="งานเร่งรัดติดตามรายตัวชี้วัด" />

        <ul className="moduleTopicList moduleTopicListCompact">
          {menuItems.map((title) => (
            <li key={title}>
              <Link href="#" className="moduleTopicLink">
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
