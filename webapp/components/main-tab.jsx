"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, Database, FileText, Map, ShieldCheck, Target } from "lucide-react";
import AddonTab from "@/components/addon-tab";

const TABS = [
  { href: "/import-check/index", label: "ปริมาณข้อมูล", Icon: FileText },
  { href: "/quality", label: "คุณภาพ", Icon: ShieldCheck },
  { href: "/standard/index", label: "ข้อมูลพื้นฐาน", Icon: Database },
  { href: "/target-group/index", label: "กลุ่มเป้าหมาย", Icon: Target },
  { href: "/workload", label: "Work Load", Icon: Activity },
  { href: "/report/index", label: "รายงาน", Icon: ClipboardList },
];

// กลุ่มขวาของ tab bar — ชิดขอบขวา
const TABS_END = [
  { href: "/gis", label: "GIS", Icon: Map },
];

function renderTab(tab, pathname, extraClass = "") {
  const Icon = tab.Icon;
  const isActive = pathname === tab.href
    || (tab.href === "/quality" && pathname.startsWith("/quality/"))
    || (tab.href === "/standard/index" && pathname.startsWith("/standard/"))
    || (tab.href === "/import-check/index" && pathname.startsWith("/import-check/"))
    || (tab.href === "/target-group/index" && pathname.startsWith("/target-group/"))
    || (tab.href === "/workload" && pathname.startsWith("/workload"))
    || (tab.href === "/gis" && pathname.startsWith("/gis/"))
    || (tab.href === "/report/index" && pathname.startsWith("/report/"));

  return (
    <Link
      key={tab.label}
      href={tab.href}
      className={`tabButton${isActive ? " tabButtonActive" : ""}${extraClass}`}
    >
      <Icon aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

export default function MainTab() {
  const pathname = usePathname();

  return (
    <nav className="tabsContainer" aria-label="เมนูหลัก">
      {TABS.map((tab) => renderTab(tab, pathname))}
      {TABS_END.map((tab, index) => renderTab(tab, pathname, index === 0 ? " tabButtonEnd" : ""))}
      <AddonTab />
    </nav>
  );
}
