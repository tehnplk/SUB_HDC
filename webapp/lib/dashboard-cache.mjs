// นิยามว่าแฟ้มไหนของหน้า /dashboard/hos-list ต้องอ่านผ่าน Redis cache แทนการนับสด
//
// เหตุผล: แฟ้มใหญ่ระดับหลายล้านแถวที่เกิน buffer pool นับสด (GROUP BY hospcode)
// ช้ามาก — charge_opd 6.6M แถวใช้ ~13 นาที/ครั้ง. summarize container นับล่วงหน้า
// เก็บ Redis ทุก 24 ชม. หน้าจึงอ่าน cache ได้ทันที. แฟ้มที่เหลือ (service ฯลฯ)
// เล็กพอนับสดได้เร็ว จึงไม่ cache เพื่อให้ตัวเลข realtime เสมอ
//
// รายชื่อนี้ผู้ใช้ระบุเจาะจง (2026-07-09): charge/diagnosis/drug ทั้ง opd+ipd และ labfu
export const CACHED_FILES = Object.freeze([
  "charge_opd",
  "charge_ipd",
  "diagnosis_opd",
  "diagnosis_ipd",
  "drug_opd",
  "drug_ipd",
  "labfu",
]);

const CACHED_FILE_SET = new Set(CACHED_FILES);

// cache 24 ชม. — ตรงกับรอบ summarize. ถ้า summarize ค้าง/พลาดรอบ key จะหมดอายุ
// แล้วหน้าจอ fallback ไปนับสด (self-heal) แทนที่จะโชว์ตัวเลขเก่าค้างตลอดไป
export const CACHE_TTL_SECONDS = 24 * 60 * 60;

export function isCachedFile(fileName) {
  return CACHED_FILE_SET.has(fileName);
}

// cache key ของ hos-list monthly rows: ผูกกับแฟ้ม + ปีงบ (พ.ศ. label เดียวกับที่
// route ส่งให้หน้าจอ). summarize เขียนด้วย key นี้ route อ่านด้วย key เดียวกัน
export function hosListCacheKey(fileName, fiscalYearLabel) {
  return `hos:${fileName}:${fiscalYearLabel}`;
}
