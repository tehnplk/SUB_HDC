"use client";

import { Database } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDbStatusOnce } from "../lib/db-status-cache.mjs";
import { compareVersions, getMaxUpdateVersion, getMaxVersionFromApi } from "../lib/update-log.mjs";
import updateLog from "../version/update_log.json";

const SUB_VERSION_API = "https://subhdc.plkhealth.go.th/api/sub-version";
// รอบกระพริบ: จาง (fade out) ครึ่งรอบ แล้วสลับข้อความ + จางเข้า (fade in) ครึ่งรอบ
const BLINK_INTERVAL_MS = 2000;
const FADE_MS = 400;
// ตัดการเช็คเวอร์ชันถ้า network ช้า/ค้าง เพื่อไม่ให้ค้างรอ response นาน
const VERSION_CHECK_TIMEOUT_MS = 8000;

export default function DashboardPageTitle() {
  const [centerName, setCenterName] = useState("");
  const [dbStatus, setDbStatus] = useState("checking");
  // เวอร์ชันใหม่กว่าที่เจอจาก center API (null = ยังไม่เจอ/ไม่มีใหม่กว่า)
  const [newerVersion, setNewerVersion] = useState(null);
  // สลับระหว่างแสดงเวอร์ชันปัจจุบัน (false) กับเวอร์ชันใหม่ (true)
  const [showNewer, setShowNewer] = useState(false);
  // คุมความโปร่งใสสำหรับ fade in/out ระหว่างสลับข้อความ
  const [versionVisible, setVersionVisible] = useState(true);
  const centerSuffix = centerName ? ` ${centerName}` : "";
  const dbLabel = dbStatus === "online" ? "Connect" : dbStatus === "error" ? "Disconnect" : "Checking";
  const currentVersion = getMaxUpdateVersion(updateLog);

  useEffect(() => {
    let active = true;

    getDbStatusOnce()
      .then((payload) => {
        if (!active) return;
        setCenterName(payload.centerName || "");
        setDbStatus(payload.status === "online" ? "online" : "error");
      })
      .catch(() => {
        if (!active) return;
        setCenterName("");
        setDbStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  // เช็คเวอร์ชันล่าสุดจาก center; ถ้าสูงกว่าเวอร์ชันในเครื่องให้เก็บไว้กระพริบ
  // กัน network: timeout + abort, และ catch ทุก error เงียบ ๆ (แค่ไม่กระพริบ
  // ไม่แสดง error ให้ผู้ใช้ และไม่ทำหน้าเว็บพัง)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);

    fetch(SUB_VERSION_API, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        const latest = getMaxVersionFromApi(payload);
        if (latest && compareVersions(latest, currentVersion) > 0) {
          setNewerVersion(latest);
        }
      })
      .catch(() => {
        // network error / timeout / abort / offline — ไม่ต้องทำอะไร คงแสดง
        // เวอร์ชันปัจจุบันนิ่ง ๆ ตามเดิม
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentVersion]);

  // กระพริบแบบ fade เมื่อพบเวอร์ชันใหม่กว่า: ทุกรอบ (BLINK_INTERVAL_MS)
  // จางออก → พอจางสุดจึงสลับเนื้อหา (เวอร์ชันเดิม ↔ "ตรวจพบ New Version") → จางเข้า
  useEffect(() => {
    if (!newerVersion) {
      setShowNewer(false);
      setVersionVisible(true);
      return;
    }

    let fadeTimer;
    const cycle = setInterval(() => {
      setVersionVisible(false);
      fadeTimer = setTimeout(() => {
        setShowNewer((prev) => !prev);
        setVersionVisible(true);
      }, FADE_MS);
    }, BLINK_INTERVAL_MS);

    return () => {
      clearInterval(cycle);
      clearTimeout(fadeTimer);
    };
  }, [newerVersion]);

  return (
    <h4 className="pageHeaderTitle">
      SUB-HDC{centerSuffix}
      <Link
        href="/update-log"
        className={`versionLabel${newerVersion ? " versionLabelUpdate" : ""}`}
        title={newerVersion ? `มีเวอร์ชันใหม่ ${newerVersion}` : undefined}
        style={newerVersion ? { opacity: versionVisible ? 1 : 0 } : undefined}
      >
        {newerVersion && showNewer ? `ตรวจพบเวอร์ชั่นใหม่กว่า ${newerVersion}` : `Version ${currentVersion}`}
      </Link>
      <span className={`dbStatusLabel dbStatusLabel-${dbStatus}`} title={`Database ${dbLabel}`}>
        <Database aria-hidden="true" />
        <span>{dbLabel}</span>
      </span>
    </h4>
  );
}
