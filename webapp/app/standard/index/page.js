import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

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
            <TopicBullet key={href} href={href} topic={topic} />
          ))}
        </ul>
      </section>
    </div>
  );
}
