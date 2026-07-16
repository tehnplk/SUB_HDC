"use client";

import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { usePathname } from "next/navigation";
import DashboardHeaderImage from "@/components/dashboard-header-image";
import DashboardPageTitle from "@/components/dashboard-page-title";
import MainTab from "@/components/main-tab";
import FloatingUserMenu from "@/components/floating-user-menu";
import Breadcrumb from "@/components/breadcrumb";
import { useUserSession } from "@/components/user-session-context";
// แต่ละ module เป็นเจ้าของ breadcrumb entry ของตัวเองใน _lib — ที่นี่แค่ import มาต่อ
import { RAPID_BREADCRUMB } from "@/app/rapid/_lib/rapid-reports.mjs";

const BREADCRUMB_MODULES = [
  {
    prefix: "/import-check",
    href: "/import-check/index",
    label: "ปริมาณข้อมูล",
    pages: {
      "/import-check/log-import": "ประวัติการนำเข้า",
      "/import-check/files-count": "จำนวนข้อมูลรายแฟ้ม",
      "/import-check/compare-hdc-person": "เปรียบเทียบประชากรกับ HDC",
    },
  },
  {
    prefix: "/workload",
    href: "/workload",
    label: "Work Load",
    pages: {
      "/workload/ncdscreen-workload": "การคัดกรองเบาหวานความดัน",
      "/workload/visit-monthly": "จำนวนให้บริการผู้ป่วยนอก",
    },
  },
  {
    prefix: "/standard",
    href: "/standard/index",
    label: "ข้อมูลมาตรฐาน",
    pages: {
      "/standard/person-typearea": "ประชากรแยกตาม TYPEAREA",
      "/standard/person-pyramid": "ประชากรแยกช่วงอายุ 5 ปี",
    },
  },
  {
    prefix: "/quality",
    href: "/quality",
    label: "คุณภาพ",
    pages: {
      "/quality/person-dup": "ประชากร TYPE 1 และ 3 ซ้ำกัน",
      "/quality/service-instype-err": "รายการบริการที่ให้รหัสสิทธิรักษาที่ไม่มีในระบบ",
    },
  },
  {
    prefix: "/target-group",
    href: "/target-group/index",
    label: "กลุ่มเป้าหมาย",
    pages: {
      "/target-group/kpi": "กลุ่มเป้าหมายตามตัวชี้วัด",
      "/target-group/kpi/dm-ht": [
        { href: "/target-group/kpi", label: "กลุ่มเป้าหมายตามตัวชี้วัด" },
        { label: "จำนวนผู้ป่วย DM/HT" },
      ],
    },
  },
  RAPID_BREADCRUMB,
  { prefix: "/report", href: "/report/index", label: "รายงาน" },
  { prefix: "/dashboard/report", href: "/report/index", label: "รายงาน" },
  { prefix: "/ai/chat", href: "/ai/chat", label: "Ask AI" },
  { prefix: "/upload", href: "/upload", label: "นำเข้าไฟล์" },
  { prefix: "/person", href: "/person", label: "ข้อมูลประชากร" },
  { prefix: "/update-log", href: "/update-log", label: "ประวัติการปรับปรุง" },
  { prefix: "/admin/addon", href: "/admin/addon", label: "จัดการระบบ Add-On" },
  { prefix: "/admin", href: "/admin", label: "User management" },
];

export default function ModuleHeader() {
  const pathname = usePathname();
  const userSession = useUserSession();
  const currentModule = BREADCRUMB_MODULES.find((item) => pathname.startsWith(item.prefix));
  const currentPage = currentModule?.pages?.[pathname];
  const currentPages = Array.isArray(currentPage)
    ? currentPage
    : currentPage ? [{ label: currentPage }] : [];
  const breadcrumbItems = currentModule
    ? [{ href: currentModule.href, label: currentModule.label }, ...currentPages]
    : [];

  return (
    <header className="moduleHeader">
      <div className="moduleHeaderCore">
        <div className="headerRow">
          <div className="titleRow">
              <DashboardHeaderImage />
              <div className="titleText">
                <DashboardPageTitle />
              </div>
          </div>
          <div className="headerActions">
          <Link href="/upload" className="navLink">
            <UploadCloud aria-hidden="true" />
            นำเข้าไฟล์
          </Link>
          <FloatingUserMenu {...userSession} variant="header" />
          </div>
        </div>
        <MainTab />
      </div>
      {breadcrumbItems.length ? <Breadcrumb items={breadcrumbItems} /> : null}
    </header>
  );
}
