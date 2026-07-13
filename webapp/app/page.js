import ModuleHeader from "@/components/module-header";
import { BarChart3, CircleCheckBig, ClipboardList, SearchCheck } from "lucide-react";

const concepts = [
  {
    icon: CircleCheckBig,
    number: "01",
    title: "ตรวจสอบคุณภาพ",
    description: "ตรวจสอบความครบถ้วน ถูกต้อง และทันเวลาของข้อมูล",
  },
  {
    icon: ClipboardList,
    number: "02",
    title: "จัดทำทะเบียนเป้าหมาย",
    description: "จัดกลุ่มประชากรเป้าหมายให้พร้อมสำหรับการดำเนินงาน",
  },
  {
    icon: SearchCheck,
    number: "03",
    title: "ติดตามส่วนขาด",
    description: "ค้นหาและติดตามข้อมูลหรือบริการที่ยังไม่ครบตามเป้าหมาย",
  },
  {
    icon: BarChart3,
    number: "04",
    title: "สรุปผลงาน",
    description: "สรุปผลการดำเนินงานเพื่อใช้ติดตามและตัดสินใจในพื้นที่",
  },
];

export default function Home() {
  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel landingConceptPanel">
        <ModuleHeader />
        <section className="landingConcept" aria-label="แนวทางการใช้ข้อมูลระดับอำเภอ">
          <div className="landingConceptBody">
            <div className="landingConceptGrid">
              {concepts.map(({ icon: Icon, number, title, description }) => (
                <article className="landingConceptCard" key={number}>
                  <div className="landingConceptCardTop">
                    <span className="landingConceptIcon" aria-hidden="true"><Icon /></span>
                    <span className="landingConceptNumber">{number}</span>
                  </div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </div>

            <div className="landingConceptVisual">
              <img src="/ai.png" alt="ผู้ช่วย AI สำหรับวิเคราะห์ข้อมูลสุขภาพ" />
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
