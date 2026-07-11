"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Database, FileText, ShieldCheck, Sparkles } from "lucide-react";

const TABS = [
  { href: "/import-check/index", label: "ปริมาณข้อมูล", Icon: FileText },
  { href: "/quality", label: "คุณภาพ", Icon: ShieldCheck },
  { href: "/standard/index", label: "ข้อมูลมาตรฐาน", Icon: Database },
  { href: "/report/index", label: "รายงาน", Icon: ClipboardList },
  { href: "/ai/chat", label: "Ask AI", Icon: Sparkles },
];

export default function MainTab() {
  const pathname = usePathname();

  return (
    <nav className="tabsContainer" aria-label="เมนูหลัก">
      {TABS.map((tab) => {
        const Icon = tab.Icon;
        const isActive = pathname === tab.href
          || (tab.href === "/standard/index" && pathname.startsWith("/standard/"))
          || (tab.href === "/import-check/index" && pathname.startsWith("/import-check/"))
          || (tab.href === "/report/index" && pathname.startsWith("/report/"));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tabButton${isActive ? " tabButtonActive" : ""}`}
          >
            <Icon aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
