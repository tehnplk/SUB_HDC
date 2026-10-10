// HTML ของหมุดและ popup บนแผนที่ GIS — L.divIcon / bindPopup รับ HTML string
// จึงประกอบเองที่นี่ ค่าจาก DB ทุกตัวต้องผ่าน escapeHtml ก่อนเสมอ

// icon ในหมุด — path ชุดเดียวกับ lucide (24x24, stroke) เขียนเป็น markup ตรง ๆ
// เพราะ L.divIcon รับ HTML string ไม่ใช่ React element. ชื่อ key = c_vulnerable.icon
export const PIN_ICONS = {
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  "hand-helping":
    '<path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"/><path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 13 6 6"/>',
  accessibility:
    '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
  "heart-pulse":
    '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  "user-round": '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
};

export const DEFAULT_PIN_ICON = "user-round";

const SEX_LABELS = { 1: "ชาย", 2: "หญิง" };

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// icon ที่ไม่รู้จักต้องไม่ทำให้หมุดว่าง — fallback เป็นตัวตั้งต้น
export function pinIconHtml(icon, color) {
  const glyph = PIN_ICONS[icon] ?? PIN_ICONS[DEFAULT_PIN_ICON];
  return `<span class="gisPin" style="--gis-pin-color:${escapeHtml(color)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg></span>`;
}

// birth มาเป็น YYYY-MM-DD (ค.ศ.) — แสดงเป็น วัน/เดือน/พ.ศ. พร้อมอายุ
export function formatBirth(birth, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth ?? "");
  if (!match) return "";
  const [, year, month, day] = match;
  const born = new Date(Number(year), Number(month) - 1, Number(day));
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth()
    || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  const thaiYear = Number(year) + 543;
  return age >= 0 ? `${day}/${month}/${thaiYear} (${age} ปี)` : `${day}/${month}/${thaiYear}`;
}

// popup ของหมุด — คลิกแล้วเห็นรายละเอียด ไม่ใช่ label ตอน hover
export function vulnerablePopupHtml(feature, now = new Date()) {
  const {
    fullname,
    sex,
    birth,
    vulnerable_name: vulnerableName,
    addr_no: addrNo,
    road,
    village_code: villageCode,
    village_name: villageName,
    moo,
    tambon_name: tambonName,
    district_name: districtName,
    province_name: provinceName,
    hospcode,
    pid,
  } = feature?.properties ?? {};

  // ที่อยู่รวมเป็นบรรทัดเดียว ข้ามส่วนที่ไม่มีข้อมูล
  const address = [
    addrNo ? `บ้านเลขที่ ${addrNo}` : "",
    villageName || (villageCode ? `หมู่บ้าน ${villageCode}` : ""),
    road ? `ถ.${road}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // รหัสหมู่บ้านแสดงเป็นชื่อพื้นที่ ถ้า join ไม่เจอค่อยตกกลับไปโชว์รหัสดิบ
  const area = [
    moo ? `หมู่ที่ ${moo}` : "",
    tambonName ? `ต.${tambonName}` : "",
    districtName ? `อ.${districtName}` : "",
    provinceName ? `จ.${provinceName}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rows = [
    ["กลุ่ม", vulnerableName],
    ["เพศ", SEX_LABELS[sex]],
    ["วันเกิด", formatBirth(birth, now)],
    ["ที่อยู่", address],
    ["พื้นที่", area || villageCode],
    ["หน่วยบริการ", hospcode],
    ["PID", pid],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  const body = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  return `<div class="gisPopup"><p class="gisPopupName">${escapeHtml(fullname || "ไม่ระบุชื่อ")}</p><dl class="gisPopupList">${body}</dl></div>`;
}
