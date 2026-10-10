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
    prefix: "/quality",
    href: "/quality",
    label: "คุณภาพ",
    pages: {
      "/quality/person-dup": "ประเภทการอยู่อาศัยซ้ำกันข้ามหน่วยบริการ (PERSON - TYPEAREA)",    },
  },
  { prefix: "/upload", href: "/upload", label: "นำเข้าไฟล์" },
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
