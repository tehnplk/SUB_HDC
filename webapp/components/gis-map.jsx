"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { pinIconHtml, vulnerablePopupHtml } from "@/lib/gis-popup.mjs";
import { draftReducer, INITIAL_DRAFT, personSearchUrl } from "@/lib/gis-draft.mjs";

// ศูนย์กลางแผนที่ = จ.พิษณุโลก
const DEFAULT_CENTER = [16.82, 100.26];
const DEFAULT_ZOOM = 9;

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// 3 base layer ให้เลือกที่มุมขวาบน — ทุกตัวเป็น tile สาธารณะ ไม่ต้องใช้ API key
const BASE_LAYERS = [
  {
    label: "แผนที่ถนน",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: OSM_ATTRIBUTION },
  },
  {
    label: "ภาพถ่ายดาวเทียม",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    // ภาพถ่ายดาวเทียมพื้นเข้ม — ชั้นข้อมูลต้องสลับไปใช้เส้นสีสว่างถึงจะเห็น
    imagery: true,
    options: {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
    },
  },
  {
    label: "ภูมิประเทศ",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    options: {
      // OpenTopoMap มี tile ถึง z17 เท่านั้น
      maxZoom: 17,
      subdomains: "abc",
      attribution: `${OSM_ATTRIBUTION}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
    },
  },
];

// panel ชั้นข้อมูลพื้นฐาน — คงที่ ไม่ขึ้นกับข้อมูลใน DB
const BASE_DATA_PANEL = {
  title: "ชั้นข้อมูลพื้นฐาน",
  layers: [
    {
      id: "subdistrict",
      label: "ขอบเขตตำบล",
      url: "/api/gis/subdistrict-boundary",
      style: { color: "#166534", weight: 2, fillColor: "#22c55e", fillOpacity: 0.12 },
      imageryStyle: { color: "#fde047", weight: 2.5, fillColor: "#fde047", fillOpacity: 0.06 },
      defaultOn: true,
    },
  ],
};

const VULNERABLE_PANEL_TITLE = "ชั้นข้อมูลกลุ่มเปราะบาง";

// สีประจำแต่ละประเภทกลุ่มเปราะบาง — วนตามลำดับ id ที่ได้จาก c_vulnerable
// (lookup ไม่มีคอลัมน์สี) เพื่อให้แยกกลุ่มออกจากกันบนแผนที่
const VULNERABLE_COLORS = ["#dc2626", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];

// หมุดร่างตอนกำลังปัก — สีแดง ลากย้ายได้ คลิกแล้วเปิดฟอร์ม
const DRAFT_PIN_COLOR = "#dc2626";
const DRAFT_PIN_ICON = "plus";

// หมุดรายคน — ใช้ divIcon ไม่ใช่ circleMarker เพื่อให้มี icon สื่อประเภทในหมุด
function vulnerableLayer({ id, name, icon }, index) {
  const color = VULNERABLE_COLORS[index % VULNERABLE_COLORS.length];
  return {
    id: `vulnerable-${id}`,
    label: name,
    url: `/api/gis/vulnerable?vulnerable=${encodeURIComponent(id)}`,
    pin: { icon, color },
  };
}

// สไตล์ของชั้นข้อมูลขึ้นกับ base layer ที่เปิดอยู่ — พื้นเข้มใช้เส้นสว่างแทน
function dataLayerStyle(baseLabel, { style, imageryStyle }) {
  const base = BASE_LAYERS.find(({ label }) => label === baseLabel);
  return base?.imagery && imageryStyle ? imageryStyle : style;
}

// ชั้นข้อมูลที่ใช้กำหนดกรอบ zoom ตั้งต้นของแผนที่
const DEFAULT_FIT_LAYER_ID = "subdistrict";

// โหลด GeoJSON ครั้งเดียวต่อชั้นข้อมูล — ใช้ร่วมกันทั้ง fit bounds ตอนเปิดหน้า
// และตอนติ๊ก checkbox จะได้ไม่ยิงซ้ำ
async function fetchLayerGeoJson(cache, id, url) {
  if (cache[id]) return cache[id];
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "โหลดชั้นข้อมูลไม่สำเร็จ");
  cache[id] = body;
  return body;
}

export default function GisMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const leafletRef = useRef(null);
  const dataLayersRef = useRef({});
  const geoJsonCacheRef = useRef({});
  const fittedRef = useRef(false);
  const activeLayerRef = useRef(BASE_LAYERS[0].label);
  const draftMarkerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState(BASE_LAYERS[0].label);
  const [vulnerableTypes, setVulnerableTypes] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeDataLayers, setActiveDataLayers] = useState(() =>
    Object.fromEntries(BASE_DATA_PANEL.layers.map(({ id, defaultOn }) => [id, defaultOn === true]))
  );

  // 1 checkbox ต่อ 1 ประเภทใน c_vulnerable — รายการมาจาก DB ไม่ hardcode
  const layerPanels = useMemo(
    () => [
      BASE_DATA_PANEL,
      { title: VULNERABLE_PANEL_TITLE, layers: vulnerableTypes.map(vulnerableLayer) },
    ],
    [vulnerableTypes]
  );
  const dataLayers = useMemo(() => layerPanels.flatMap(({ layers }) => layers), [layerPanels]);
  const [loadingDataLayer, setLoadingDataLayer] = useState(null);
  const [dataLayerError, setDataLayerError] = useState("");
  const [draft, dispatch] = useReducer(draftReducer, INITIAL_DRAFT);
  const {
    addMode,
    pos: draftPos,
    formOpen,
    fields: draftFields,
    saving,
    saveError,
    personQuery,
    personResults,
    personSearching,
    personError,
    personSearched,
  } = draft;

  useEffect(() => {
    let cancelled = false;

    // โหลด leaflet ตอน mount เท่านั้น — ต้องมี window (idiom เดียวกับ chart.js
    // ในหน้า Ask AI)
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      leafletRef.current = L;
      // guard: StrictMode ใน dev mount ซ้ำ ถ้าไม่กันจะได้ "Map container is
      // already initialized"
      if (cancelled || !containerRef.current || mapRef.current) return;

      // ปิด layers control ในตัวของ leaflet — สลับ tile ผ่าน btn group ด้านล่างแทน
      const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      mapRef.current = map;

      layersRef.current = Object.fromEntries(
        BASE_LAYERS.map(({ label, url, options }) => [label, L.tileLayer(url, options)])
      );
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layersRef.current = {};
      dataLayersRef.current = {};
      geoJsonCacheRef.current = {};
      leafletRef.current = null;
      draftMarkerRef.current = null;
      fittedRef.current = false;
      setReady(false);
    };
  }, []);

  // ใส่เฉพาะ layer ที่เลือก ถอดตัวอื่นออก — รันครั้งแรกตอน map พร้อมด้วย
  useEffect(() => {
    activeLayerRef.current = activeLayer;
    const map = mapRef.current;
    if (!ready || !map) return;

    Object.entries(layersRef.current).forEach(([label, layer]) => {
      const shouldShow = label === activeLayer;
      if (shouldShow && !map.hasLayer(layer)) layer.addTo(map);
      if (!shouldShow && map.hasLayer(layer)) map.removeLayer(layer);
    });

    // เปลี่ยน base layer แล้วต้องย้อมชั้นข้อมูลใหม่ ไม่งั้นเส้นเขียวเข้มจมหายไป
    // กับภาพถ่ายดาวเทียม
    dataLayers.forEach((config) => {
      const dataLayer = dataLayersRef.current[config.id];
      // หมุดเป็น marker ไม่มี setStyle — ย้อมเฉพาะชั้นที่เป็น path จริง
      if (dataLayer && config.style) dataLayer.setStyle(dataLayerStyle(activeLayer, config));
    });
  }, [ready, activeLayer, dataLayers]);

  // หน่วยบริการในอำเภอ ใช้เป็นตัวเลือกแรกของฟอร์มก่อนค้นรายชื่อ
  useEffect(() => {
    let cancelled = false;

    fetch("/api/gis/hospitals", { cache: "no-store" })
      .then((res) => res.json())
      .then(({ items }) => {
        if (!cancelled) setHospitals(items ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // ดึงประเภทกลุ่มเปราะบางมาสร้าง checkbox — ไม่ผูกกับ leaflet ทำได้ตั้งแต่ mount
  useEffect(() => {
    let cancelled = false;

    fetch("/api/gis/c-vulnerable", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "โหลดประเภทกลุ่มเปราะบางไม่สำเร็จ");
        return body;
      })
      .then(({ items }) => {
        if (!cancelled) setVulnerableTypes(items ?? []);
      })
      .catch((error) => {
        if (!cancelled) setDataLayerError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // zoom ตั้งต้นให้พอดีกรอบขอบเขตตำบลของอำเภอตาม .env AMP_CODE — ทำครั้งเดียว
  // ตอนเปิดหน้า ถ้าโหลดไม่ได้ก็คงค่า DEFAULT_CENTER/DEFAULT_ZOOM ไว้
  useEffect(() => {
    const L = leafletRef.current;
    if (!ready || !mapRef.current || !L || fittedRef.current) return;
    const fitLayer = BASE_DATA_PANEL.layers.find(({ id }) => id === DEFAULT_FIT_LAYER_ID);
    if (!fitLayer) return;
    let cancelled = false;

    fetchLayerGeoJson(geoJsonCacheRef.current, fitLayer.id, fitLayer.url)
      .then((geojson) => {
        if (cancelled || !mapRef.current || fittedRef.current) return;
        const bounds = L.geoJSON(geojson).getBounds();
        if (!bounds.isValid()) return;
        fittedRef.current = true;
        mapRef.current.fitBounds(bounds, { padding: [16, 16] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [ready]);

  // เปิด/ปิดชั้นข้อมูล — ใช้ GeoJSON จาก cache เดียวกับตอน fit bounds
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L) return;
    let cancelled = false;

    dataLayers.forEach((config) => {
      const { id, url } = config;
      const shouldShow = activeDataLayers[id] === true;
      const layer = dataLayersRef.current[id];

      if (!shouldShow) {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
        return;
      }
      if (layer) {
        if (!map.hasLayer(layer)) layer.addTo(map);
        return;
      }

      setLoadingDataLayer(id);
      fetchLayerGeoJson(geoJsonCacheRef.current, id, url)
        .then((geojson) => {
          if (cancelled || !mapRef.current) return;
          const created = L.geoJSON(geojson, {
            style: dataLayerStyle(activeLayerRef.current, config),
            pointToLayer: config.pin
              ? (feature, latlng) =>
                  L.marker(latlng, {
                    icon: L.divIcon({
                      className: "gisPinIcon",
                      html: pinIconHtml(config.pin.icon, config.pin.color),
                      // ปลายหมุดชี้ที่พิกัดจริง — anchor อยู่มุมล่างของกล่อง 30x38
                      iconSize: [30, 38],
                      iconAnchor: [15, 38],
                      popupAnchor: [0, -34],
                    }),
                  })
              : undefined,
            onEachFeature: (feature, featureLayer) => {
              if (config.pin) {
                featureLayer.bindPopup(vulnerablePopupHtml(feature));
                return;
              }
              const label = feature?.properties?.name_th;
              if (label) featureLayer.bindTooltip(label, { sticky: true });
            },
          });
          dataLayersRef.current[id] = created;
          created.addTo(mapRef.current);
          setDataLayerError("");
        })
        .catch((error) => {
          if (cancelled) return;
          setDataLayerError(error.message);
          setActiveDataLayers((current) => ({ ...current, [id]: false }));
        })
        .finally(() => {
          if (!cancelled) setLoadingDataLayer(null);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [ready, activeDataLayers, dataLayers]);

  // โหมดเพิ่มหมุด — คลิกบนแผนที่หนึ่งครั้งเพื่อ "ปัก" หมุดร่างสีแดง แล้วออกจากโหมด
  // (ยังไม่เปิดฟอร์ม ผู้ใช้ลากปรับตำแหน่งก่อน แล้วคลิกหมุดเพื่อกรอกข้อมูล)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L || !addMode) return;

    const container = map.getContainer();
    container.classList.add("gisMapAdding");
    const onClick = ({ latlng }) => {
      removeDraftMarker();

      const marker = L.marker(latlng, {
        draggable: true,
        icon: L.divIcon({
          className: "gisPinIcon",
          html: pinIconHtml(DRAFT_PIN_ICON, DRAFT_PIN_COLOR),
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        }),
      });
      // leaflet กด click หลังลากให้เอง จึงไม่เปิดฟอร์มค้างตอนลากเสร็จ
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        dispatch({ type: "move", pos: { lat, lng } });
      });
      marker.on("click", () => dispatch({ type: "openForm" }));
      marker.addTo(map);
      draftMarkerRef.current = marker;

      dispatch({ type: "drop", pos: { lat: latlng.lat, lng: latlng.lng } });
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      container.classList.remove("gisMapAdding");
    };
  }, [ready, addMode]);

  function removeDraftMarker() {
    const marker = draftMarkerRef.current;
    if (marker && mapRef.current?.hasLayer(marker)) mapRef.current.removeLayer(marker);
    draftMarkerRef.current = null;
  }

  function cancelDraft() {
    removeDraftMarker();
    dispatch({ type: "cancel" });
  }

  // โหลดชั้นข้อมูลใหม่หลังบันทึก — ล้าง cache แล้วให้ effect สร้าง layer ใหม่
  function reloadDataLayer(layerId) {
    delete geoJsonCacheRef.current[layerId];
    const layer = dataLayersRef.current[layerId];
    if (layer && mapRef.current?.hasLayer(layer)) mapRef.current.removeLayer(layer);
    delete dataLayersRef.current[layerId];
    setActiveDataLayers((current) => ({ ...current, [layerId]: true }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    dispatch({ type: "saveStart" });
    try {
      const res = await fetch("/api/gis/vulnerable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draftFields, lat: draftPos.lat, lng: draftPos.lng }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "บันทึกไม่สำเร็จ");
      reloadDataLayer(`vulnerable-${draftFields.vulnerable}`);
      removeDraftMarker();
      dispatch({ type: "saved" });
    } catch (error) {
      dispatch({ type: "saveFailed", error: error.message });
    }
  }

  // ค้นชื่อจากแฟ้ม PERSON + HOME — lname/house เข้ารหัสไว้ API ถอดให้ฝั่ง server
  // หน่วงก่อนยิงค้นหา ไม่ให้ยิงทุกตัวอักษรที่พิมพ์
  useEffect(() => {
    if (!formOpen) return;
    const url = personSearchUrl(draftFields.hospcode, personQuery);
    if (!url) {
      dispatch({ type: "searchReset" });
      return;
    }
    let cancelled = false;

    const timer = setTimeout(() => {
      dispatch({ type: "searchStart" });
      fetch(url, { cache: "no-store" })
        .then(async (res) => {
          const body = await res.json();
          // หน้าแผนที่เปิดสาธารณะ แต่การค้นรายชื่อต้อง login — บอกให้ตรงเหตุ
          if (res.status === 401) throw new Error("ต้องเข้าสู่ระบบก่อนจึงจะค้นรายชื่อได้");
          if (!res.ok) throw new Error(body?.error || "ค้นหาไม่สำเร็จ");
          return body;
        })
        .then(({ items }) => {
          if (!cancelled) dispatch({ type: "searchDone", items: items ?? [] });
        })
        .catch((error) => {
          if (!cancelled) dispatch({ type: "searchFailed", error: error.message });
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [personQuery, formOpen, draftFields.hospcode]);

  const setDraftField = (field) => (event) =>
    dispatch({ type: "setField", field, value: event.target.value });

  return (
    <div className="gisMapWrap">
      <div ref={containerRef} className="gisMap" role="application" aria-label="แผนที่ GIS" />

      {formOpen && draftPos ? (
        <form className="gisAddForm" onSubmit={saveDraft}>
          <p className="gisAddFormTitle">เพิ่มหมุดกลุ่มเปราะบาง</p>
          <p className="gisAddFormCoord">
            {draftPos.lat.toFixed(5)}, {draftPos.lng.toFixed(5)}
          </p>

          {/* เลือกหน่วยบริการก่อน แล้วค่อยค้นรายชื่อ — การค้นถูกจำกัดตามหน่วยที่เลือก */}
          <label>
            <span className="srOnly">หน่วยบริการ</span>
            <select value={draftFields.hospcode} onChange={setDraftField("hospcode")} required>
              <option value="">เลือกหน่วยบริการ</option>
              {hospitals.map(({ hospcode, hospname_short: name }) => (
                <option key={hospcode} value={hospcode}>
                  {hospcode} {name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="srOnly">กลุ่มเปราะบาง</span>
            <select value={draftFields.vulnerable} onChange={setDraftField("vulnerable")} required>
              <option value="">เลือกกลุ่ม</option>
              {vulnerableTypes.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="gisPersonSearch">
            <label>
              <span className="srOnly">ค้นหาชื่อ-สกุลจากแฟ้ม PERSON</span>
              <input
                value={draftFields.fullname}
                onChange={(event) => dispatch({ type: "typeName", value: event.target.value })}
                placeholder={draftFields.hospcode ? "ค้นชื่อ เว้นวรรคแล้วพิมพ์นามสกุล" : "เลือกหน่วยบริการก่อน"}
                autoComplete="off"
                disabled={!draftFields.hospcode}
              />
            </label>
            {personSearching ? <p className="gisPersonHint">กำลังค้นหา…</p> : null}
            {!personSearching && personError ? (
              <p className="gisPersonHint gisPersonHintError">{personError}</p>
            ) : null}
            {!personSearching && !personError && personSearched && personResults.length === 0 ? (
              <p className="gisPersonHint">ไม่พบรายชื่อ</p>
            ) : null}
            {personResults.length > 0 ? (
              <ul className="gisPersonResults">
                {personResults.map((person) => (
                  <li key={`${person.hospcode}-${person.pid}`}>
                    <button type="button" onClick={() => dispatch({ type: "pickPerson", person })}>
                      <span>{person.fullname}</span>
                      <span className="gisPersonMeta">{person.hospcode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="gisAddFormRow">
            <label>
              <span className="srOnly">เลขบัตรประชาชน</span>
              <input value={draftFields.cid} onChange={setDraftField("cid")} placeholder="เลขบัตรประชาชน" maxLength={13} />
            </label>
            <label>
              <span className="srOnly">เพศ</span>
              <select value={draftFields.sex} onChange={setDraftField("sex")}>
                <option value="">ไม่ระบุเพศ</option>
                <option value="1">ชาย</option>
                <option value="2">หญิง</option>
              </select>
            </label>
          </div>

          <label>
            <span className="srOnly">วันเกิด</span>
            <input type="date" value={draftFields.birth} onChange={setDraftField("birth")} />
          </label>

          <div className="gisAddFormRow">
            <label>
              <span className="srOnly">บ้านเลขที่</span>
              <input value={draftFields.addr_no} onChange={setDraftField("addr_no")} placeholder="บ้านเลขที่" />
            </label>
            <label>
              <span className="srOnly">ถนน</span>
              <input value={draftFields.road} onChange={setDraftField("road")} placeholder="ถนน" />
            </label>
          </div>

          <div className="gisAddFormRow">
            <label>
              <span className="srOnly">รหัสหมู่บ้าน 8 หลัก</span>
              <input
                value={draftFields.village_code}
                onChange={setDraftField("village_code")}
                placeholder="รหัสหมู่บ้าน"
                inputMode="numeric"
                pattern="\d{8}"
                maxLength={8}
              />
            </label>
            <label>
              <span className="srOnly">ชื่อหมู่บ้าน</span>
              <input value={draftFields.village_name} onChange={setDraftField("village_name")} placeholder="ชื่อหมู่บ้าน" />
            </label>
          </div>

          {/* หน่วยบริการ/PID เป็นคีย์ของระเบียน ปกติมาจากการเลือกรายชื่อ จึงอยู่ล่างสุด */}
          <label>
            <span className="srOnly">PID</span>
            <input value={draftFields.pid} onChange={setDraftField("pid")} placeholder="PID" required />
          </label>

          {saveError ? <p className="gisAddFormError">{saveError}</p> : null}

          <div className="gisAddFormActions">
            <button type="button" className="gisAddFormCancel" onClick={cancelDraft}>
              ยกเลิก
            </button>
            <button type="submit" className="gisAddFormSave" disabled={saving}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="gisMapPanels">
        <div className="gisLayerToggle" role="group" aria-label="เลือกชั้นแผนที่">
          {BASE_LAYERS.map(({ label }) => (
            <button
              key={label}
              type="button"
              className={`gisLayerToggleBtn${label === activeLayer ? " gisLayerToggleBtnActive" : ""}`}
              aria-pressed={label === activeLayer}
              onClick={() => setActiveLayer(label)}
            >
              {label}
            </button>
          ))}
        </div>

        {layerPanels.map(({ title, layers }) => layers.length === 0 ? null : (
          <div key={title} className="gisDataPanel">
            <p className="gisDataPanelTitle">{title}</p>
            {layers.map(({ id, label }) => (
              <label key={id} className="gisDataLayerItem">
                <input
                  type="checkbox"
                  checked={activeDataLayers[id] === true}
                  onChange={(event) =>
                    setActiveDataLayers((current) => ({ ...current, [id]: event.target.checked }))
                  }
                />
                <span>{label}</span>
                {loadingDataLayer === id ? <span className="gisDataLayerHint">…</span> : null}
              </label>
            ))}

            {title === VULNERABLE_PANEL_TITLE ? (
              <div className="gisPanelTool">
                <button
                  type="button"
                  className={`gisToolButton${addMode ? " gisToolButtonActive" : ""}`}
                  aria-pressed={addMode}
                  title="เพิ่มหมุดกลุ่มเปราะบาง"
                  onClick={() => {
                    removeDraftMarker();
                    dispatch({ type: "toggleAdd" });
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  <span>เพิ่มหมุด</span>
                </button>
                {addMode ? <p className="gisToolHint">คลิกตำแหน่งบนแผนที่</p> : null}
                {draftPos && !formOpen ? (
                  <p className="gisToolHint">ลากหมุดเพื่อย้าย แล้วคลิกหมุดเพื่อกรอกข้อมูล</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {dataLayerError ? (
          <div className="gisDataPanel">
            <p className="gisDataPanelError">{dataLayerError}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
