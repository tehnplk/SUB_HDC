"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, ExternalLink, LayoutDashboard, LayoutGrid } from "lucide-react";

// ต่อ session-id เข้า url เสมอ (client-side ใช้กับรายการคงที่) — ค่ามาจาก API
function appendSessionId(url, sessionId) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}session-id=${encodeURIComponent(sessionId || "none")}`;
}

// รายการคงที่ (ไม่ลง database) — อยู่ท้ายสุดของเมนูเสมอ คั่นด้วย separator
// ต่อ session-id เหมือนรายการอื่น (ถ้ามี = cid_hash, ไม่มี = none)
const FIXED_ITEMS = [
  {
    system_name: "Dashboard-จังหวัด",
    url: "https://subhdc.plkhealth.go.th/",
    Icon: LayoutDashboard,
  },
  {
    system_name: "ดาวน์โหลด",
    url: "https://subhdc.plkhealth.go.th/dashboard/download",
    Icon: Download,
  },
];

// main tab 'Add-On' — dropdown ของระบบเสริมจากตาราง c_addon_url
// แต่ละ item เปิด url แบบ _blank โดย API ต่อ cid_hash ของผู้ใช้ไว้ให้แล้ว
export default function AddonTab() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [sessionId, setSessionId] = useState("none");
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    fetch("/api/addon-url", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setSessionId(data?.sessionId || "none");
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (wrapRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="addonTabWrap">
      <button
        type="button"
        className={`tabButton addonTabButton${open ? " tabButtonActive" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutGrid aria-hidden="true" />
        Add-On
        <ChevronDown aria-hidden="true" className="addonTabChevron" />
      </button>
      {open ? (
        <div className="addonMenu" role="menu" aria-label="ระบบเสริม">
          {!loaded ? (
            <span className="addonMenuEmpty">…</span>
          ) : (
            <>
              {items.map((item) => (
                <a
                  key={item.system_name + item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="addonMenuItem"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink aria-hidden="true" />
                  <span>{item.system_name}</span>
                </a>
              ))}
              {/* รายการคงที่ — ท้ายสุดเสมอ + separator เหนือกลุ่มนี้ถ้ามี item ก่อนหน้า */}
              {items.length > 0 ? <div className="addonMenuSeparator" role="separator" /> : null}
              {FIXED_ITEMS.map((item) => {
                const Icon = item.Icon;
                return (
                  <a
                    key={item.url}
                    href={appendSessionId(item.url, sessionId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="addonMenuItem"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.system_name}</span>
                  </a>
                );
              })}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
