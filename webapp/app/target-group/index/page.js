import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

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
            <TopicBullet key={topic} href={href} topic={topic} />
          ))}
        </ul>
      </section>
    </div>
  );
}
