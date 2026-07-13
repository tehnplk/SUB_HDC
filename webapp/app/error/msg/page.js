import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import ModuleHeader from "@/components/module-header";

// หน้าแจ้ง error กลาง — ข้อความส่งผ่าน ?msg= (default ไม่มีสิทธิ)
export default async function ErrorMsgPage({ searchParams, showLogin = true }) {
  const params = await searchParams;
  const message = params?.msg || "คุณไม่มีสิทธิเข้าใช้งานส่วนนี้";

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <ModuleHeader subtitle="ไม่สามารถดำเนินการได้" />

        <div className="errorMsgCard" role="alert">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>ไม่มีสิทธิ</strong>
            <p>{message}</p>
            {showLogin ? <Link href="/login" className="errorMsgAction">เข้าสู่ระบบ</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
