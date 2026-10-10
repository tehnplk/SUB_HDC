import Link from "next/link";
import ModuleHeader from "@/components/module-header";
import LandingDistrictMap from "@/components/landing-district-map";
import { ArrowRight, FileText, Map, ShieldCheck } from "lucide-react";

const concepts = [
  {
    href: "/import-check/index",
    icon: FileText,
    title: "ปริมาณข้อมูล",
    description: "ติดตามการนำเข้าและจำนวนข้อมูล 43 แฟ้มของแต่ละหน่วยบริการ",
  },
  {
    href: "/quality",
    icon: ShieldCheck,
    title: "คุณภาพข้อมูล",
    description: "ตรวจสอบความถูกต้องของรหัสและข้อมูลที่บันทึกซ้ำซ้อน",
  },
  {
    href: "/gis",
    icon: Map,
    title: "GIS",
    description: "แผนที่ขอบเขตตำบลและพิกัดกลุ่มเปราะบางในพื้นที่",
  },
];

export default function Home() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel landingPanel">
        <ModuleHeader />
        <div className="landingBody">
          <div className="landingMain">
            <div className="landingIntro">
              <h1>ข้อมูลสุขภาพระดับอำเภอ</h1>
              <p>ใช้ข้อมูล 43 แฟ้มจากทุกหน่วยบริการ ตรวจสอบปริมาณ คุณภาพ และดูข้อมูลบนแผนที่ในที่เดียว</p>
            </div>
            <nav className="landingGrid" aria-label="งานหลัก">
              {concepts.map(({ href, icon: Icon, title, description }) => (
                <Link className="landingCard" href={href} key={href}>
                  <span className="landingCardIcon" aria-hidden="true"><Icon /></span>
                  <span className="landingCardTitle">
                    {title}
                    <ArrowRight aria-hidden="true" />
                  </span>
                  <span className="landingCardText">{description}</span>
                </Link>
              ))}
            </nav>
          </div>
          <LandingDistrictMap />
        </div>
      </section>
    </div>
  );
}
