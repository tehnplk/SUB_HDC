import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

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
            <TopicBullet key={href} href={href} topic={topic} />
          ))}
        </ul>
      </section>
    </div>
  );
}
