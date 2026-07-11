"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlarmClock, ClipboardList, Database, FileText, ShieldCheck, Sparkles, Target } from "lucide-react";

const TABS = [
  { href: "/import-check/index", label: "ปริมาณข้อมูล", Icon: FileText },
  { href: "/quality", label: "คุณภาพ", Icon: ShieldCheck },
  { href: "/standard/index", label: "ข้อมูลมาตรฐาน", Icon: Database },
  { href: "/target-group/index", label: "ทะเบียนกลุ่มเป้าหมาย", Icon: Target },
  { href: "/report/index", label: "รายงาน", Icon: ClipboardList },
  { href: "/ai/chat", label: "Ask AI", Icon: Sparkles },
];

// กลุ่มขวาของ tab bar — ชิดขอบขวา; badge = จำนวนหัวข้อที่ต้องเร่งรัด
// (ยังเป็นค่าคงที่ตามหัวข้อใน /rapid/index — มีระบบนับจริงค่อยเปลี่ยนเป็น fetch)
const TABS_END = [
  { href: "/rapid/index", label: "งานเร่งรัดติดตาม", Icon: AlarmClock, badge: 4 },
];

const BADGE_BLINK_KEY = "tabBadgeBlinked";
const BADGE_BLINK_MS = 10000;

function renderTab(tab, pathname, badgeBlink, extraClass = "") {
  const Icon = tab.Icon;
  const isActive = pathname === tab.href
    || (tab.href === "/standard/index" && pathname.startsWith("/standard/"))
    || (tab.href === "/import-check/index" && pathname.startsWith("/import-check/"))
    || (tab.href === "/target-group/index" && pathname.startsWith("/target-group/"))
    || (tab.href === "/rapid/index" && pathname.startsWith("/rapid/"))
    || (tab.href === "/report/index" && pathname.startsWith("/report/"));

  return (
    <Link
      key={tab.label}
      href={tab.href}
      className={`tabButton${isActive ? " tabButtonActive" : ""}${extraClass}`}
    >
      <Icon aria-hidden="true" />
      {tab.label}
      {tab.badge ? (
        <span className={`tabBadgeDanger${badgeBlink ? " tabBadgeBlink" : ""}`}>{tab.badge}</span>
      ) : null}
    </Link>
  );
}

export default function MainTab() {
  const pathname = usePathname();
  // กระพริบแบบ fade 5 วิเฉพาะครั้งแรกของ session — จำผ่าน sessionStorage
  // ไม่ให้กระพริบซ้ำทุกครั้งที่เปลี่ยนหน้า
  const [badgeBlink, setBadgeBlink] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(BADGE_BLINK_KEY)) return;
    sessionStorage.setItem(BADGE_BLINK_KEY, "1");
    setBadgeBlink(true);
    const timer = setTimeout(() => setBadgeBlink(false), BADGE_BLINK_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <nav className="tabsContainer" aria-label="เมนูหลัก">
      {/* กระพริบเฉพาะ badge ของกลุ่มขวา (งานเร่งรัดติดตาม) — กลุ่มซ้ายไม่กระพริบ */}
      {TABS.map((tab) => renderTab(tab, pathname, false))}
      {TABS_END.map((tab, index) => renderTab(tab, pathname, badgeBlink, index === 0 ? " tabButtonEnd" : ""))}
    </nav>
  );
}
