"use client";

import { useEffect, useState } from "react";
import packageConfig from "../package.json";

export default function DashboardPageTitle() {
  const [centerName, setCenterName] = useState("");
  const centerSuffix = centerName ? ` ${centerName}` : "";

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard?summary=true", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        return res.json();
      })
      .then((payload) => {
        setCenterName(payload.centerName || "");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setCenterName("");
      });

    return () => controller.abort();
  }, []);

  return (
    <h4 className="pageHeaderTitle">
      SUB-HDC{centerSuffix}
      <span className="versionLabel">Version {packageConfig.version}</span>
    </h4>
  );
}
