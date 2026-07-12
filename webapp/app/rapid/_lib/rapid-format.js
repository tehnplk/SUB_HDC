// ตัวช่วย format ที่ใช้ร่วมทุกหน้า /rapid

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

// ย่อชื่อสังกัดให้สั้น
export function formatAffiliation(value) {
  const affiliation = String(value || "").trim();
  if (affiliation === "กระทรวงสาธารณสุข") return "สธ";
  if (affiliation === "องค์กรปกครองส่วนท้องถิ่น") return "อปท";
  return affiliation || "-";
}

export function formatDate(value) {
  if (!value) return "…";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
