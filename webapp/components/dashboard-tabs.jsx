"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/hos-list", label: "รายหน่วยงาน" },
  { href: "/dashboard/file-list", label: "รายแฟ้ม" },
  { href: "/dashboard/quality", label: "คุณภาพ" },
  { href: "/dashboard/log-import", label: "ประวัติการนำเข้า" },
];

export default function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="tabsContainer">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tabButton${pathname === tab.href ? " tabButtonActive" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
