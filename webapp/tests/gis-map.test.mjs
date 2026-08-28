import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const mapSource = read("../components/gis-map.jsx");
const pageSource = read("../app/gis/page.js");
const proxySource = read("../proxy.js");
const globalCss = read("../app/globals.css");
const packageJson = JSON.parse(read("../package.json"));

test("/gis renders the leaflet map component", () => {
  assert.match(pageSource, /import GisMap from "@\/components\/gis-map"/);
  assert.match(pageSource, /<GisMap \/>/);
  assert.ok(packageJson.dependencies.leaflet);
});

test("/gis requires a User role or higher", () => {
  assert.match(proxySource, /const PROTECTED_PAGE_PREFIXES = \[[\s\S]*?"\/gis"[\s\S]*?\];/);
  assert.match(proxySource, /Number\(request\.auth\.user\.roleId\) === 4/);
});

test("the map loads leaflet on the client only and cleans itself up", () => {
  assert.match(mapSource, /^"use client";/);
  // โหลดตอน mount เท่านั้น — leaflet ต้องมี window
  assert.match(mapSource, /import\("leaflet"\)/);
  assert.match(mapSource, /import "leaflet\/dist\/leaflet\.css"/);
  // กัน StrictMode mount ซ้ำ + คืน map ตอน unmount
  assert.match(mapSource, /if \(cancelled \|\| !containerRef\.current \|\| mapRef\.current\) return;/);
  assert.match(mapSource, /mapRef\.current\.remove\(\)/);
});

test("three base layers toggle from a button group at the top-right of the map", () => {
  const baseLayerBlock = mapSource.slice(
    mapSource.indexOf("const BASE_LAYERS"),
    mapSource.indexOf("const BASE_DATA_PANEL"),
  );
  const labels = [...baseLayerBlock.matchAll(/^\s*label: "([^"]+)",$/gm)].map(([, label]) => label);
  assert.deepEqual(labels, ["แผนที่ถนน", "ภาพถ่ายดาวเทียม", "ภูมิประเทศ"]);

  // สลับด้วย btn group ของเราเอง ไม่ใช้ layers control ของ leaflet
  assert.doesNotMatch(mapSource, /L\.control/);
  assert.match(mapSource, /role="group" aria-label="เลือกชั้นแผนที่"/);
  assert.match(mapSource, /aria-pressed=\{label === activeLayer\}/);
  assert.match(mapSource, /onClick=\{\(\) => setActiveLayer\(label\)\}/);
  // ตัวแรกเป็น layer ตั้งต้น
  assert.match(mapSource, /useState\(BASE_LAYERS\[0\]\.label\)/);
  // ใส่เฉพาะตัวที่เลือก ถอดตัวอื่นออก
  assert.match(mapSource, /if \(shouldShow && !map\.hasLayer\(layer\)\) layer\.addTo\(map\);/);
  assert.match(mapSource, /if \(!shouldShow && map\.hasLayer\(layer\)\) map\.removeLayer\(layer\);/);
  // ทุก tile ต้องมี attribution
  assert.equal((mapSource.match(/attribution:/g) || []).length, 3);

  assert.match(globalCss, /\.gisMapWrap \{\s*position: relative;/);
  assert.match(globalCss, /\.gisMap \{/);
  // stack ของ panel ลอยมุมขวาบน เหนือ control ของ leaflet
  assert.match(
    globalCss,
    /\.gisMapPanels \{[\s\S]*?position: absolute;[\s\S]*?right: 12px;[\s\S]*?z-index: 1000;/,
  );
  assert.match(globalCss, /\.gisLayerToggle \{/);
  assert.match(globalCss, /\.gisLayerToggleBtnActive,/);
});

test("the data-layer panel sits under the tile toggle and switches layers by checkbox", () => {
  // panel ต่อท้าย btn group ใน stack เดียวกันมุมขวาบน
  assert.match(mapSource, /<div className="gisMapPanels">/);
  assert.match(mapSource, /title: "ชั้นข้อมูลพื้นฐาน",/);
  assert.match(mapSource, /const VULNERABLE_PANEL_TITLE = "ชั้นข้อมูลกลุ่มเปราะบาง";/);
  assert.match(mapSource, /<p className="gisDataPanelTitle">\{title\}<\/p>/);
  assert.match(mapSource, /const dataLayers = useMemo\(\(\) => layerPanels\.flatMap\(\(\{ layers \}\) => layers\), \[layerPanels\]\);/);
  // panel ที่ยังไม่มีชั้นข้อมูลต้องไม่โผล่กล่องเปล่า
  assert.match(mapSource, /layers\.length === 0 \? null :/);
  assert.match(mapSource, /type="checkbox"/);
  assert.match(mapSource, /checked=\{activeDataLayers\[id\] === true\}/);
  // ขอบเขตตำบลติ๊กไว้ตั้งแต่เปิดหน้า — state ตั้งต้นอ่านจาก defaultOn ของ config
  assert.match(mapSource, /^\s*defaultOn: true,$/m);
  assert.match(mapSource, /Object\.fromEntries\(BASE_DATA_PANEL\.layers\.map\(\(\{ id, defaultOn \}\) => \[id, defaultOn === true\]\)\)/);
  assert.match(globalCss, /\.gisMapPanels \{[\s\S]*?position: absolute;[\s\S]*?flex-direction: column;/);
  assert.match(globalCss, /\.gisDataPanel \{/);

  // ชั้นข้อมูลขอบเขตตำบลอ่านจาก API ของตัวเอง โหลดครั้งแรกที่เปิดแล้ว cache ใน ref
  assert.match(mapSource, /url: "\/api\/gis\/subdistrict-boundary"/);
  assert.match(mapSource, /fetch\(url, \{ cache: "no-store" \}\)/);
  assert.match(mapSource, /dataLayersRef\.current\[id\] = created;/);
  assert.match(mapSource, /if \(layer && map\.hasLayer\(layer\)\) map\.removeLayer\(layer\);/);
});

test("the boundary API filters subdistricts by AMP_CODE from the PostGIS store", () => {
  const routeSource = read("../app/api/gis/subdistrict-boundary/route.js");
  const libSource = read("../lib/postgis.js");

  assert.ok(packageJson.dependencies.pg);
  // อำเภอมาจาก .env AMP_CODE เท่านั้น ไม่รับจาก query string
  assert.match(libSource, /districtBoundaryCode\(ampCode = process\.env\.AMP_CODE\)/);
  assert.match(libSource, /return digits \? `TH\$\{digits\}` : "";/);
  assert.match(routeSource, /WHERE district_code = \$1/);
  assert.doesNotMatch(routeSource, /searchParams/);
  // ตอบเป็น GeoJSON ให้ leaflet ใช้ตรง ๆ
  assert.match(routeSource, /ST_AsGeoJSON\(geom\)/);
  assert.match(routeSource, /type: "FeatureCollection"/);
  // pool cache ผูกกับ config — แก้ env แล้วต้องไม่ค้าง pool เดิม
  assert.match(libSource, /if \(cached\?\.key === key\) return cached\.pool;/);
});

test("the initial view fits the subdistrict boundary extent", () => {
  assert.match(mapSource, /const DEFAULT_FIT_LAYER_ID = "subdistrict";/);
  assert.match(mapSource, /const bounds = L\.geoJSON\(geojson\)\.getBounds\(\);/);
  assert.match(mapSource, /mapRef\.current\.fitBounds\(bounds, \{ padding: \[16, 16\] \}\);/);
  // fit ครั้งเดียว และ bounds ที่ใช้ไม่ได้ต้องไม่ล้ม view เดิม
  assert.match(mapSource, /if \(!bounds\.isValid\(\)\) return;/);
  assert.match(mapSource, /fittedRef\.current = true;/);
  // GeoJSON ใช้ cache ร่วมกับ checkbox — เปิดหน้าแล้วยิง API ครั้งเดียว
  assert.match(mapSource, /async function fetchLayerGeoJson\(cache, id, url\)/);
  assert.match(mapSource, /if \(cache\[id\]\) return cache\[id\];/);
  assert.equal((mapSource.match(/fetchLayerGeoJson\(geoJsonCacheRef\.current/g) || []).length, 2);
  // GeoJSON ถูกยิงจากที่เดียวคือ helper ตัวนี้ (fetch อื่นเป็น lookup/ค้นชื่อ/บันทึก)
  const helper = mapSource.slice(
    mapSource.indexOf("async function fetchLayerGeoJson"),
    mapSource.indexOf("export default function GisMap"),
  );
  assert.equal((helper.match(/fetch\(/g) || []).length, 1);
});

test("boundary lines stay visible when the imagery basemap is active", () => {
  // ภาพถ่ายดาวเทียมพื้นเข้ม เส้นเขียวเข้มจมหาย ต้องสลับเป็นสไตล์เส้นสว่าง
  assert.match(mapSource, /^\s*imagery: true,$/m);
  assert.match(mapSource, /imageryStyle: \{ color: "#fde047"/);
  assert.match(mapSource, /function dataLayerStyle\(baseLabel, \{ style, imageryStyle \}\)/);
  assert.match(mapSource, /return base\?\.imagery && imageryStyle \? imageryStyle : style;/);
  // ย้อมใหม่ตอนสลับ base layer และตอนสร้าง layer ครั้งแรก
  assert.match(mapSource, /dataLayer\.setStyle\(dataLayerStyle\(activeLayer, config\)\);/);
  assert.match(mapSource, /style: dataLayerStyle\(activeLayerRef\.current, config\),/);
});

test("clicking a polygon does not draw the browser focus rectangle", () => {
  // browser โฟกัส path แล้ววาด focus ring ตาม bounding box = กรอบสี่เหลี่ยม
  assert.match(globalCss, /\.gisMap \.leaflet-interactive:focus \{\s*outline: none;/);
  // แต่คนใช้คีย์บอร์ดต้องยังเห็นว่าโฟกัสอยู่ที่ไหน
  assert.match(globalCss, /\.gisMap \.leaflet-interactive:focus-visible \{\s*outline: 2px solid/);
});

test("the map cannot paint over the header dropdowns", () => {
  // leaflet ใช้ z-index ถึง 1000 ส่วนเมนูของ header อยู่แค่ 30-80 —
  // ต้อง isolate แผนที่ไว้ใน stacking context ของตัวเองที่ระดับ 0
  assert.match(globalCss, /\.gisMapWrap \{[\s\S]*?z-index: 0;[\s\S]*?isolation: isolate;/);
  const addonMenuZ = globalCss.match(/\.addonMenu \{[\s\S]*?z-index: (\d+);/);
  const floatingUserZ = globalCss.match(/\.floatingUser \{[\s\S]*?z-index: (\d+);/);
  assert.ok(Number(addonMenuZ[1]) > 0);
  assert.ok(Number(floatingUserZ[1]) > 0);
});

test("the vulnerable-group layer draws people as points from its own table", () => {
  const routeSource = read("../app/api/gis/vulnerable/route.js");
  const ddl = readFileSync(
    new URL("../../migrate/postgis/20260828_create_vulnerable.sql", import.meta.url),
    "utf8",
  );

  // 1 checkbox ต่อ 1 แถวใน c_vulnerable — รายการมาจาก DB ไม่ hardcode ในหน้า
  assert.match(mapSource, /fetch\("\/api\/gis\/c-vulnerable", \{ cache: "no-store" \}\)/);
  assert.match(mapSource, /layers: vulnerableTypes\.map\(vulnerableLayer\)/);
  assert.match(mapSource, /id: `vulnerable-\$\{id\}`/);
  assert.match(mapSource, /url: `\/api\/gis\/vulnerable\?vulnerable=\$\{encodeURIComponent\(id\)\}`/);
  // แต่ละกลุ่มคนละสี ไม่งั้นแยกกลุ่มบนแผนที่ไม่ออก
  assert.match(mapSource, /const VULNERABLE_COLORS = \[/);
  assert.match(mapSource, /VULNERABLE_COLORS\[index % VULNERABLE_COLORS\.length\]/);
  // หมุดมี icon สื่อประเภท — divIcon รับ HTML string จึงเขียน path ของ lucide ตรง ๆ
  assert.match(mapSource, /const PIN_ICONS = \{/);
  for (const icon of ["bed", '"hand-helping"', "accessibility", '"user-round"']) {
    assert.ok(mapSource.includes(`${icon}:`), `PIN_ICONS ต้องมี ${icon}`);
  }
  assert.match(mapSource, /const DEFAULT_PIN_ICON = "user-round";/);
  // icon ที่ไม่รู้จักต้องไม่ทำให้หมุดหาย — fallback เป็นตัวตั้งต้น
  assert.match(mapSource, /PIN_ICONS\[icon\] \?\? PIN_ICONS\[DEFAULT_PIN_ICON\]/);
  assert.match(mapSource, /pointToLayer: config\.pin/);
  assert.match(mapSource, /L\.divIcon\(\{/);
  // ปลายหมุดต้องชี้ที่พิกัดจริง ไม่ใช่กึ่งกลางกล่อง
  assert.match(mapSource, /iconSize: \[30, 38\],/);
  assert.match(mapSource, /iconAnchor: \[15, 38\],/);
  // marker ไม่มี setStyle — ต้องข้ามตอนย้อมสีตาม base layer
  assert.match(mapSource, /if \(dataLayer && config\.style\) dataLayer\.setStyle/);
  assert.match(globalCss, /\.gisPin \{/);
  assert.match(globalCss, /transform: rotate\(-45deg\);/);
  // คลิกหมุดแล้วเห็นรายละเอียด — ไม่ใช้ tooltip ตอน hover กับหมุด
  assert.match(mapSource, /featureLayer\.bindPopup\(vulnerablePopupHtml\(feature\)\)/);
  assert.match(mapSource, /popupAnchor: \[0, -34\],/);
  // ขอบเขตยังเป็น tooltip ตอน hover เหมือนเดิม
  assert.match(mapSource, /featureLayer\.bindTooltip\(label, \{ sticky: true \}\)/);
  // popup ประกอบ HTML เอง — ข้อมูลจาก DB ต้อง escape ก่อนเสมอ
  assert.match(mapSource, /function escapeHtml\(value\)/);
  assert.doesNotMatch(mapSource, /\$\{fullname\}|\$\{vulnerableName\}|\$\{value\}/);
  assert.match(mapSource, /escapeHtml\(fullname \|\| "ไม่ระบุชื่อ"\)/);
  assert.match(mapSource, /const SEX_LABELS = \{ 1: "ชาย", 2: "หญิง" \};/);
  // birth เป็น ค.ศ. — แสดงเป็น พ.ศ. พร้อมอายุ
  assert.match(mapSource, /const thaiYear = Number\(year\) \+ 543;/);
  assert.match(mapSource, /if \(beforeBirthday\) age -= 1;/);
  assert.match(globalCss, /\.gisPopupName \{/);
  assert.match(globalCss, /\.gisPopupList \{/);

  const columns = [...ddl.matchAll(/^  ([a-z_]+) +(?:varchar|smallint|date|geometry)/gm)].map(([, c]) => c);
  assert.deepEqual(columns, [
    "id",
    "name",
    "icon",
    "is_active",
    "hospcode",
    "pid",
    "cid",
    "fullname",
    "sex",
    "birth",
    "vulnerable",
    "addr_no",
    "road",
    "village_code",
    "village_name",
    "geo_point",
  ]);
  // คอลัมน์ที่อยู่ต้องเพิ่มให้ตารางที่มีอยู่แล้วด้วย ไม่ใช่แค่ใน CREATE TABLE
  for (const column of ["addr_no varchar(20)", "road varchar(120)", "village_code varchar(8)", "village_name varchar(120)"]) {
    assert.ok(
      ddl.includes(`ADD COLUMN IF NOT EXISTS ${column}`),
      `ต้องมี ALTER ... ADD COLUMN IF NOT EXISTS ${column}`,
    );
  }
  assert.match(ddl, /CONSTRAINT vulnerable_pkey PRIMARY KEY \(hospcode, pid\)/);
  assert.match(ddl, /geo_point\s+geometry\(Point, 4326\)/);
  assert.match(ddl, /USING gist \(geo_point\)/);
  // ย้ายชื่อจากของเดิมได้โดยไม่ทิ้งข้อมูล และรันซ้ำได้
  assert.match(ddl, /ALTER TABLE public\.vulnerable_person RENAME TO vulnerable;/);
  assert.match(ddl, /ALTER TABLE public\.vulnerable RENAME COLUMN group_name TO vulnerable;/);
  assert.doesNotMatch(ddl, /DROP TABLE/);

  // ไม่ select cid ออกมา (คอมเมนต์อธิบายเหตุผลได้ แต่ SQL ต้องไม่มี)
  assert.doesNotMatch(routeSource, /v\.cid/);
  // pg แปลง date เป็น Date ตาม timezone แล้ววันเพี้ยน — ต้อง to_char
  assert.match(routeSource, /to_char\(v\.birth, 'YYYY-MM-DD'\) AS birth/);
  assert.match(routeSource, /WHERE v\.geo_point IS NOT NULL/);
  // รหัสที่ยกเลิกแล้วต้องยังขึ้นแผนที่ — join ไม่กรอง is_active
  assert.match(routeSource, /LEFT JOIN c_vulnerable c ON c\.id = v\.vulnerable/);
  assert.doesNotMatch(routeSource, /is_active\s*=/);
  // กรองรายกลุ่มผ่าน query string และต้องเป็นจำนวนเต็มเท่านั้น
  assert.match(routeSource, /AND \(\$1::smallint IS NULL OR v\.vulnerable = \$1::smallint\)/);
  assert.match(routeSource, /if \(vulnerable !== null && !Number\.isInteger\(vulnerable\)\)/);

  // endpoint รายการประเภท — ตัดรหัสที่ยกเลิกแล้วออกจากตัวเลือก
  const lookupSource = read("../app/api/gis/c-vulnerable/route.js");
  assert.match(lookupSource, /SELECT id, name, icon FROM c_vulnerable WHERE is_active = 1 ORDER BY id/);
});

test("c_vulnerable is the lookup for the vulnerable column", () => {
  const ddl = readFileSync(
    new URL("../../migrate/postgis/20260828_create_vulnerable.sql", import.meta.url),
    "utf8",
  );

  assert.match(ddl, /CREATE TABLE IF NOT EXISTS public\.c_vulnerable/);
  // สเปกเดียวกับ c_* ของ MariaDB: is_active NOT NULL DEFAULT 1
  assert.match(ddl, /is_active\s+smallint\s+NOT NULL DEFAULT 1/);
  assert.match(ddl, /CONSTRAINT c_vulnerable_pkey PRIMARY KEY \(id\)/);
  // ตารางที่มีอยู่แล้วบนเครื่องอื่นต้องได้คอลัมน์ icon ด้วย
  assert.match(ddl, /ADD COLUMN IF NOT EXISTS icon varchar\(40\)/);
  assert.match(ddl, /\(1, 'ผู้สูงอายุที่มีภาวะพึ่งพิง', 'hand-helping'\),/);
  assert.match(ddl, /\(2, 'ผู้ป่วยติดเตียง', 'bed'\),/);
  assert.match(ddl, /\(3, 'ผู้พิการ', 'accessibility'\)/);
  // ทุก icon ที่ seed ต้องมีใน PIN_ICONS ไม่งั้นหมุดตกไปใช้ตัวตั้งต้นเงียบ ๆ
  for (const [, icon] of ddl.matchAll(/, '([a-z-]+)'\),?$/gm)) {
    assert.ok(mapSource.includes(`${icon}:`) || mapSource.includes(`"${icon}":`), `PIN_ICONS ขาด ${icon}`);
  }
  // seed ต้องรันซ้ำได้
  assert.match(ddl, /ON CONFLICT \(id\) DO UPDATE SET name = EXCLUDED\.name, icon = EXCLUDED\.icon;/);
  // soft reference — ทั้ง schema ไม่ใช้ foreign key
  assert.doesNotMatch(ddl, /REFERENCES|FOREIGN KEY/);
});

test("the Add Point toolbox sits under the zoom control and saves through a guarded POST", () => {
  const routeSource = read("../app/api/gis/vulnerable/route.js");

  // ปุ่มอยู่ใน panel กลุ่มเปราะบาง ไม่ใช่ toolbox ลอยฝั่งซ้ายแล้ว
  assert.doesNotMatch(mapSource, /gisMapTools/);
  assert.doesNotMatch(globalCss, /\.gisMapTools/);
  assert.match(mapSource, /\{title === VULNERABLE_PANEL_TITLE \? \(/);
  assert.match(mapSource, /<div className="gisPanelTool">/);
  assert.match(globalCss, /\.gisPanelTool \{/);
  assert.match(mapSource, /aria-pressed=\{addMode\}/);
  assert.match(mapSource, /<span>เพิ่มหมุด<\/span>/);
  // ต้องชนะ cursor: grab ของ leaflet บน container เดียวกัน
  assert.match(globalCss, /\.gisMap\.gisMapAdding,/);

  // ติดโหมดแล้วคลิกแผนที่ครั้งเดียวเพื่อ "ปัก" หมุดร่าง แล้วออกจากโหมดทันที
  assert.match(mapSource, /map\.on\("click", onClick\)/);
  assert.match(mapSource, /map\.off\("click", onClick\)/);
  assert.match(mapSource, /setAddMode\(false\);/);
  // หมุดร่างสีแดง ลากย้ายได้ และยังไม่เปิดฟอร์มตอนปัก
  assert.match(mapSource, /const DRAFT_PIN_COLOR = "#dc2626";/);
  assert.match(mapSource, /draggable: true,/);
  assert.match(mapSource, /html: pinIconHtml\(DRAFT_PIN_ICON, DRAFT_PIN_COLOR\)/);
  assert.match(mapSource, /marker\.on\("dragend", \(\) => \{/);
  // คลิกหมุดร่างอีกทีถึงเปิดฟอร์ม
  assert.match(mapSource, /marker\.on\("click", \(\) => setFormOpen\(true\)\);/);
  assert.match(mapSource, /\{formOpen && draftPos \? \(/);
  // ฟอร์มอยู่กลางแผนที่เสมอ จึงไม่ตกขอบไม่ว่าปักหมุดตรงไหน
  assert.match(globalCss, /\.gisAddForm \{[\s\S]*?top: 50%;[\s\S]*?left: 50%;[\s\S]*?transform: translate\(-50%, -50%\);/);
  assert.match(globalCss, /\.gisAddForm \{[\s\S]*?max-height: calc\(100% - 24px\);/);
  // ยกเลิก/บันทึกต้องเก็บหมุดร่างออกจากแผนที่
  assert.match(mapSource, /function removeDraftMarker\(\)/);
  assert.match(mapSource, /onClick=\{cancelDraft\}/);
  // บันทึกแล้วต้องล้าง cache ให้ layer โหลดใหม่ ไม่งั้นหมุดใหม่ไม่ขึ้น
  assert.match(mapSource, /delete geoJsonCacheRef\.current\[layerId\];/);
  assert.match(mapSource, /reloadDataLayer\(`vulnerable-\$\{draftFields\.vulnerable\}`\)/);

  // ฝั่งเขียนต้อง login ก่อน ส่วน GET ยังเปิดสาธารณะเหมือนตัวแผนที่
  assert.match(routeSource, /export async function POST\(request\)/);
  assert.match(routeSource, /const unauthorized = await requireGisAuth\(\);/);
  // validate ก่อนเขียนเสมอ
  assert.match(routeSource, /if \(!hospcode \|\| !pid\)/);
  assert.match(routeSource, /if \(!Number\.isInteger\(vulnerable\)\)/);
  assert.match(routeSource, /if \(!Number\.isFinite\(lat\) \|\| !Number\.isFinite\(lng\)\)/);
  // ST_MakePoint รับ (lng, lat) ตามลำดับนี้เท่านั้น
  assert.match(routeSource, /ST_SetSRID\(ST_MakePoint\(\$12, \$13\), 4326\)/);
  assert.match(routeSource, /addrNo, road, villageCode, villageName, lng, lat\]/);
  // เพิ่มซ้ำคนเดิมต้องแก้ของเดิม ไม่ใช่ error PK ชน
  assert.match(routeSource, /ON CONFLICT \(hospcode, pid\) DO UPDATE SET/);

  // ที่อยู่: รหัสหมู่บ้านต้องเป็นตัวเลข 8 หลักเท่านั้น
  assert.ok(routeSource.includes(String.raw`if (villageCode && !/^\d{8}$/.test(villageCode))`));
  assert.match(routeSource, /v\.addr_no, v\.road, v\.village_code, v\.village_name,/);
  assert.match(routeSource, /addr_no = EXCLUDED\.addr_no, road = EXCLUDED\.road,/);
  // ฟอร์มมีช่องกรอกครบ
  for (const placeholder of ["บ้านเลขที่", "ถนน", "รหัสหมู่บ้าน", "ชื่อหมู่บ้าน"]) {
    assert.ok(mapSource.includes(`placeholder="${placeholder}"`), `ฟอร์มต้องมีช่อง ${placeholder}`);
  }
  // popup รวมที่อยู่เป็นบรรทัดเดียว ข้ามส่วนที่ว่าง
  assert.match(mapSource, /\["ที่อยู่", address\],/);
  assert.match(mapSource, /\.filter\(Boolean\)/);

  // รหัสหมู่บ้านแสดงเป็นชื่อพื้นที่ — 6 หลักแรก join subdistrict_boundary
  assert.match(routeSource, /LEFT JOIN subdistrict_boundary sb/);
  assert.ok(routeSource.includes("ON sb.code = 'TH' || left(v.village_code, 6)"));
  // หมู่ที่ตัดศูนย์นำหน้าออก (05 -> 5)
  assert.ok(routeSource.includes("NULLIF(ltrim(right(v.village_code, 2), '0'), '') AS moo"));
  assert.match(mapSource, /moo \? `หมู่ที่ \$\{moo\}` : "",/);
  assert.match(mapSource, /tambonName \? `ต\.\$\{tambonName\}` : "",/);
  assert.match(mapSource, /districtName \? `อ\.\$\{districtName\}` : "",/);
  assert.match(mapSource, /provinceName \? `จ\.\$\{provinceName\}` : "",/);
  // join ไม่เจอต้องไม่หายไปเฉย ๆ — ตกกลับไปโชว์รหัสดิบ
  assert.match(mapSource, /\["พื้นที่", area \|\| villageCode\],/);
});

test("the draft form searches names from PERSON joined to HOME", () => {
  const searchSource = read("../app/api/gis/person-search/route.js");
  const cryptoSource = read("../lib/f43-decrypt.mjs");

  // ข้อมูลระบุตัวบุคคล ต้อง login ก่อนค้น
  assert.match(searchSource, /const unauthorized = await requireGisAuth\(\);/);
  assert.match(searchSource, /FROM person p/);
  assert.match(searchSource, /LEFT JOIN home h ON h\.hospcode = p\.hospcode AND h\.hid = p\.hid/);
  // lname/house/cid เข้ารหัสไว้ กรองใน SQL ไม่ได้ ต้องถอดใน node แล้วค่อยกรอง
  assert.match(searchSource, /AND p\.name LIKE \?/);
  // ค้นเฉพาะประชากรในเขต (typearea 1,3) ที่ยังไม่จำหน่าย (discharge 9)
  assert.match(searchSource, /AND p\.typearea IN \('1', '3'\)/);
  assert.match(searchSource, /AND p\.discharge = '9'/);
  assert.match(searchSource, /decryptAes\(row\.lname, key\)/);
  assert.match(searchSource, /decryptAes\(row\.cid_aes, key\)/);
  assert.match(searchSource, /decryptAes\(row\.house, key\)/);
  assert.match(searchSource, /if \(lastNameTerm && !lname\.startsWith\(lastNameTerm\)\) continue;/);
  // person.birth เป็น YYYYMMDD, village_code ประกอบจาก 4 ส่วนของ home
  assert.match(searchSource, /function toIsoDate\(birth\)/);
  assert.match(searchSource, /\[pad2\(changwat\), pad2\(ampur\), pad2\(tambon\), pad2\(village\)\]/);

  // ถอดรหัสต้องเข้าคู่กับ encryptAes ของ importer (aes-256-gcm, iv12 + tag16)
  assert.match(cryptoSource, /createDecipheriv\("aes-256-gcm", key, iv\)/);
  assert.match(cryptoSource, /decipher\.setAuthTag\(tag\)/);
  assert.match(cryptoSource, /createHash\("sha256"\)\.update\(raw\)\.digest\(\)/);
  assert.match(cryptoSource, /if \(buffer\.length <= 28\) return "";/);

  // ฝั่งฟอร์ม: หน่วงก่อนยิง แล้วเลือกผลลัพธ์มาเติมทุกช่อง
  assert.match(mapSource, /setTimeout\(\(\) => \{/);
  assert.match(mapSource, /\/api\/gis\/person-search\?q=\$\{encodeURIComponent\(query\)\}/);
  assert.match(mapSource, /function pickPerson\(person\)/);
  assert.match(mapSource, /setDraftFields\(\(current\) => \(\{ \.\.\.current, \.\.\.person \}\)\)/);
  assert.match(mapSource, /onClick=\{\(\) => pickPerson\(person\)\}/);
  assert.match(globalCss, /\.gisPersonResults \{/);
});

test("GIS write and search endpoints skip login in dev only", () => {
  const gisAuth = read("../lib/gis-auth.mjs");

  // production ยังบังคับ login ตามเดิม ข้ามเฉพาะตอน next dev
  assert.match(gisAuth, /if \(process\.env\.NODE_ENV !== "production"\) return null;/);
  assert.match(gisAuth, /return requireAppAuth\(\);/);
  // ต้องไม่แตะ guard กลางที่หน้าอื่นใช้ร่วมกัน
  const authGuard = read("../lib/auth-guard.mjs");
  assert.doesNotMatch(authGuard, /NODE_ENV/);
});

test("the name search needs only two characters and always shows feedback", () => {
  const searchSource = read("../app/api/gis/person-search/route.js");

  assert.match(searchSource, /if \(query\.length < 2\) return Response\.json\(\{ items: \[\] \}\);/);
  assert.match(mapSource, /if \(!draftFields\.hospcode \|\| query\.length < 2\) \{/);
  // ค้นแล้วไม่เจอ หรือ error ต้องมีข้อความบอก ไม่ใช่เงียบ
  assert.match(mapSource, /ไม่พบรายชื่อ/);
  assert.match(mapSource, /personSearched && personResults\.length === 0/);
  assert.match(mapSource, /if \(res\.status === 401\) throw new Error\("ต้องเข้าสู่ระบบก่อนจึงจะค้นรายชื่อได้"\);/);
  assert.match(globalCss, /\.gisPersonHintError \{/);
});

test("the draft form orders keys last and forces a group choice", () => {
  const form = mapSource.slice(mapSource.indexOf('className="gisAddForm"'));
  const order = [...form.matchAll(/placeholder="([^"]+)"|<option value="">([^<]+)</g)]
    .map(([, placeholder, option]) => placeholder || option);

  // หน่วยบริการมาก่อนสุด เพราะต้องเลือกก่อนถึงจะค้นรายชื่อได้
  assert.deepEqual(order, [
    "เลือกหน่วยบริการ",
    "เลือกกลุ่ม",
    "เลขบัตรประชาชน",
    "ไม่ระบุเพศ",
    "บ้านเลขที่",
    "ถนน",
    "รหัสหมู่บ้าน",
    "ชื่อหมู่บ้าน",
    "PID",
  ]);

  // ไม่เลือกกลุ่มให้ล่วงหน้า และบังคับเลือกก่อนบันทึก
  assert.match(mapSource, /setDraftFields\(\{ \.\.\.EMPTY_DRAFT_FIELDS \}\);/);
  assert.doesNotMatch(mapSource, /vulnerable: String\(vulnerableTypes\[0\]/);
  assert.match(mapSource, /<option value="">เลือกกลุ่ม<\/option>/);
  assert.match(mapSource, /onChange=\{setDraftField\("vulnerable"\)\} required/);
});

test("HOME address comes back with the person search, minus placeholder values", () => {
  const searchSource = read("../app/api/gis/person-search/route.js");

  assert.match(searchSource, /h\.house, h\.road, h\.villaname, h\.village, h\.tambon, h\.ampur, h\.changwat/);
  assert.match(searchSource, /addr_no: cleanText\(decryptAes\(row\.house, key\)\)/);
  assert.match(searchSource, /road: cleanText\(row\.road\)/);
  assert.match(searchSource, /village_name: cleanText\(row\.villaname\)/);
  // แฟ้ม HOME ใส่ "-" / "0" แทนค่าว่าง ต้องไม่เอามาเติมในฟอร์ม
  assert.match(searchSource, /return text === "-" \|\| text === "0" \? "" : text;/);
});

test("the pin form picks a facility in the district before searching a person", () => {
  const hospitalsSource = read("../app/api/gis/hospitals/route.js");
  const searchSource = read("../app/api/gis/person-search/route.js");

  // รายชื่อหน่วยบริการมาจาก c_hospital ตามอำเภอใน .env AMP_CODE (จังหวัด2 + อำเภอ2)
  assert.match(hospitalsSource, /FROM c_hospital/);
  assert.match(hospitalsSource, /WHERE provcode = \? AND distcode = \? AND status = '1'/);
  assert.match(hospitalsSource, /digits\.slice\(0, 2\), digits\.slice\(2, 4\)/);
  assert.match(hospitalsSource, /if \(digits\.length !== 4\)/);

  // ค้นรายชื่อต้องมี hospcode เสมอ ไม่งั้นได้คนทั้งอำเภอปนกัน
  assert.match(searchSource, /if \(!hospcode\) return Response\.json\(\{ items: \[\] \}\);/);
  assert.match(searchSource, /WHERE p\.hospcode = \?/);
  assert.match(searchSource, /\[hospcode, `\$\{firstName\}%`, SCAN_LIMIT\]/);

  // ฝั่งฟอร์ม: select หน่วยบริการ + ปิดช่องค้นชื่อจนกว่าจะเลือก
  assert.match(mapSource, /fetch\("\/api\/gis\/hospitals", \{ cache: "no-store" \}\)/);
  assert.match(mapSource, /<option value="">เลือกหน่วยบริการ<\/option>/);
  assert.match(mapSource, /onChange=\{setDraftField\("hospcode"\)\} required/);
  assert.match(mapSource, /disabled=\{!draftFields\.hospcode\}/);
  assert.match(mapSource, /if \(!draftFields\.hospcode \|\| query\.length < 2\)/);
  assert.match(mapSource, /&hospcode=\$\{encodeURIComponent\(draftFields\.hospcode\)\}/);
});
