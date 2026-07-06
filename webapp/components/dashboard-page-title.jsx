"use client";

import { Database } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDbStatusOnce } from "../lib/db-status-cache.mjs";
import { getMaxUpdateVersion } from "../lib/update-log.mjs";
import updateLog from "../update_log.json";

export default function DashboardPageTitle() {
  const [centerName, setCenterName] = useState("");
  const [dbStatus, setDbStatus] = useState("checking");
  const centerSuffix = centerName ? ` ${centerName}` : "";
  const dbLabel = dbStatus === "online" ? "Connect" : dbStatus === "error" ? "Disconnect" : "Checking";

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

  return (
    <h4 className="pageHeaderTitle">
      SUB-HDC{centerSuffix}
      <Link href="/update-log" className="versionLabel">
        Version {getMaxUpdateVersion(updateLog)}
      </Link>
      <span className={`dbStatusLabel dbStatusLabel-${dbStatus}`} title={`Database ${dbLabel}`}>
        <Database aria-hidden="true" />
        <span>{dbLabel}</span>
      </span>
    </h4>
  );
}
