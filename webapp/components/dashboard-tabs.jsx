"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FileStack, History, ShieldCheck } from "lucide-react";

const TABS = [
  { href: "/dashboard/hos-list", label: "รายหน่วยงาน", Icon: Building2 },
  { href: "/dashboard/file-list", label: "รายแฟ้ม", Icon: FileStack },
  { href: "/dashboard/quality", label: "คุณภาพ", Icon: ShieldCheck },
  { href: "/dashboard/log-import", label: "ประวัติการนำเข้า", Icon: History },
  { href: "/dashboard/report", label: "รายงาน", Icon: ClipboardList },
];

export default function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="tabsContainer">
      {TABS.map((tab) => {
        const Icon = tab.Icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tabButton${pathname === tab.href ? " tabButtonActive" : ""}`}
          >
            <Icon aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
