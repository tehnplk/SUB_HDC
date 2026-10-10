"use client";

import { useEffect, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { fitFeaturesToSvg } from "@/lib/geo-svg.mjs";

const SIZE = 400;

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function LandingDistrictMap() {
  const [shapes, setShapes] = useState(null);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [lastImport, setLastImport] = useState(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/gis/subdistrict-boundary", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((geojson) => {
        if (!active) return;
        const fitted = fitFeaturesToSvg(geojson.features, { width: SIZE, height: SIZE });
        if (fitted.length) setShapes(fitted);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));

    fetch("/api/dashboard?logImport=true&status=success", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const row = payload?.rows?.[0];
        if (active) setLastImport(row ? row.finish_date_time || row.import_date_time : null);
      })
      .catch(() => active && setLastImport(null));

    return () => {
      active = false;
    };
  }, []);

  if (failed) return null;

  const first = shapes?.[0]?.properties;
  const areaName = first ? `อ.${first.district_th} จ.${first.province_th}` : "";

  return (
    <figure className="landingMap">
      {shapes ? (
        <svg
          className="landingMapSvg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`แผนที่ตำบลใน${areaName} ${shapes.length} ตำบล`}
          onMouseLeave={() => setHovered(null)}
        >
          {shapes.map(({ properties, d }) => (
            <path
              key={properties.code || properties.name_th}
              d={d}
              className="landingMapShape"
              onMouseEnter={() => setHovered(properties.name_th)}
            >
              <title>{`ต.${properties.name_th}`}</title>
            </path>
          ))}
        </svg>
      ) : (
        <div className="landingMapSvg landingMapPlaceholder" aria-hidden="true" />
      )}
      <figcaption>
        <strong>{shapes ? (hovered ? `ต.${hovered}` : areaName) : "…"}</strong>
        <span className="landingMapMeta">
          <span><MapPin aria-hidden="true" />{shapes ? `${shapes.length} ตำบล` : "…"}</span>
          {lastImport === null ? null : (
            <span>
              <RefreshCw aria-hidden="true" />
              นำเข้าล่าสุด {lastImport === undefined ? "…" : formatDate(lastImport)}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
