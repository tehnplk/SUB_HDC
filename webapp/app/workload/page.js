import ModuleHeader from "@/components/module-header";
import TopicBullet from "@/components/topic-bullet";

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
            <TopicBullet key={href} href={href} topic={topic} />
          ))}
        </ul>
      </section>
    </div>
  );
}
