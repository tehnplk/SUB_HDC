"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Map, ShieldCheck } from "lucide-react";
import AddonTab from "@/components/addon-tab";

const TABS = [
  { href: "/import-check/index", label: "ปริมาณข้อมูล", Icon: FileText },
  { href: "/quality", label: "คุณภาพ", Icon: ShieldCheck },
  { href: "/gis", label: "GIS", Icon: Map },
];

function renderTab(tab, pathname) {
  const Icon = tab.Icon;
  const isActive = pathname === tab.href
    || (tab.href === "/quality" && pathname.startsWith("/quality/"))
    || (tab.href === "/import-check/index" && pathname.startsWith("/import-check/"))
    || (tab.href === "/gis" && pathname.startsWith("/gis/"));

  return (
    <Link
      key={tab.label}
      href={tab.href}
      className={`tabButton${isActive ? " tabButtonActive" : ""}`}
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
      <AddonTab />
    </nav>
  );
}
