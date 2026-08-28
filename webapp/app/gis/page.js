import ModuleHeader from "@/components/module-header";
import GisMap from "@/components/gis-map";

export default function GisPage() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel standardPanel">
        <ModuleHeader subtitle="แผนที่ข้อมูลสุขภาพเชิงพื้นที่" />
        <GisMap />
      </section>
    </div>
  );
}
