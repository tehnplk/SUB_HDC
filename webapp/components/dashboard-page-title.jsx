"use client";

import { Database } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMaxUpdateVersion } from "../lib/update-log.mjs";
import updateLog from "../upldate_log.json";

export default function DashboardPageTitle() {
  const [centerName, setCenterName] = useState("");
  const [dbStatus, setDbStatus] = useState("checking");
  const centerSuffix = centerName ? ` ${centerName}` : "";
  const dbLabel = dbStatus === "online" ? "Connect" : dbStatus === "error" ? "Disconnect" : "Checking";

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard?summary=true", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        return res.json();
      })
      .then((payload) => {
        setCenterName(payload.centerName || "");
        setDbStatus("online");
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setCenterName("");
          setDbStatus("error");
        }
      });

    return () => controller.abort();
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
