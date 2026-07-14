import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainTabSource = readFileSync(new URL("../components/main-tab.jsx", import.meta.url), "utf8");
const addonTabSource = readFileSync(new URL("../components/addon-tab.jsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/addon-url/route.js", import.meta.url), "utf8");

test("MainTab renders the Add-On dropdown tab", () => {
  assert.match(mainTabSource, /import AddonTab/);
  assert.match(mainTabSource, /<AddonTab \/>/);
});

test("AddonTab loads items from the addon-url API and opens each url in a new tab", () => {
  assert.match(addonTabSource, /Add-On/);
  assert.match(addonTabSource, /fetch\("\/api\/addon-url"/);
  assert.match(addonTabSource, /item\.system_name/);
  assert.match(addonTabSource, /href=\{item\.url\}/);
  assert.match(addonTabSource, /target="_blank"/);
});

test("AddonTab appends fixed items (Dashboard-จังหวัด, ดาวน์โหลด) after DB items with a separator", () => {
  // URL คงที่ (ไม่ผ่าน database)
  assert.match(addonTabSource, /system_name: "Dashboard-จังหวัด"[\s\S]*url: "https:\/\/subhdc\.plkhealth\.go\.th\/"/);
  assert.match(addonTabSource, /https:\/\/subhdc\.plkhealth\.go\.th\/dashboard\/download/);
  // Dashboard-จังหวัด อยู่ก่อน ดาวน์โหลด ใน FIXED_ITEMS
  assert.ok(addonTabSource.indexOf("Dashboard-จังหวัด") < addonTabSource.indexOf("ดาวน์โหลด"));
  // separator เฉพาะเมื่อมี item ก่อนหน้า และอยู่เหนือกลุ่มรายการคงที่
  assert.match(addonTabSource, /items\.length > 0 \? <div className="addonMenuSeparator"[\s\S]*FIXED_ITEMS\.map/);
  // กลุ่มคงที่อยู่หลัง items.map ของ DB — เป็นรายการสุดท้าย
  const dbMapIdx = addonTabSource.indexOf("items.map");
  const fixedMapIdx = addonTabSource.indexOf("FIXED_ITEMS.map");
  assert.ok(dbMapIdx !== -1 && fixedMapIdx !== -1 && fixedMapIdx > dbMapIdx);
});

test("addon-url API serves items without login and appends session-id (cid_hash) only for ProviderID sessions", () => {
  assert.match(routeSource, /await auth\(\)/);
  // ไม่ login ก็ได้รายการ — ไม่มี guard 401 ตัดหน้า
  assert.doesNotMatch(routeSource, /if \(!session\?\.user\)/);
  assert.match(routeSource, /session\?\.user\?\.providerId/);
  assert.match(routeSource, /SELECT cid_hash FROM c_user_provider WHERE provider_id = \?/);
  assert.match(routeSource, /SELECT system_name, url FROM c_addon_url WHERE is_active = 1/);
  // query string ใช้ชื่อ session-id ค่าเป็น cid_hash
  assert.match(routeSource, /session-id=/);
});
