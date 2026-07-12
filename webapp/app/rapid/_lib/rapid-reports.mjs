// นิยามตัวชี้วัด "งานเร่งรัดติดตาม" — key = report_id ของ HDC (ตาราง hdc_api_report)
// แต่ละตัวดึงข้อมูล live จาก HDC opendata API แล้วสรุปเป็น เป้าหมาย/ผลงาน รายหน่วยบริการ
//
// targetCols/resultCols = คอลัมน์ที่นำมา "รวม" ต่อ 1 แถว (report_data ของ HDC เป็น
// ราย hospcode+areacode รายเดือน จึงต้องรวมหลายคอลัมน์/หลายแถวเข้าเป็นรายหน่วยบริการ)

// เดือนของ HDC เรียงตามปีงบประมาณ (ต.ค. → ก.ย.)
const EPI_MONTHS = ["10", "11", "12", "01", "02", "03", "04", "05", "06", "07", "08", "09"];

export const RAPID_REPORTS = {
  "143": {
    title: "ผู้ป่วยโรคเบาหวานควบคุมระดับน้ำตาลได้ดี (DM Control)",
    tableName: "s_dm_control",
    targetCols: ["target"],
    resultCols: ["result"],
    controlCols: ["hba1c"],
    targetLabel: "ผู้ป่วย DM",
    resultLabel: "คุมน้ำตาลได้ดี",
    controlLabel: "ได้รับการตรวจ",
  },
  "52": {
    title: "ความครอบคลุมวัคซีนป้องกันหัด-คางทูม-หัดเยอรมัน เข็มที่ 2 (MMR2)",
    tableName: "s_epi2",
    targetCols: EPI_MONTHS.map((m) => `target${m}`),
    resultCols: EPI_MONTHS.map((m) => `mmr2_${m}`),
    targetLabel: "เด็กอายุครบ 2 ปี",
    resultLabel: "ได้รับวัคซีน MMR2",
  },
  "276": {
    title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคความดันโลหิตสูง",
    tableName: "s_ht_screen_risk",
    targetCols: ["target"],
    resultCols: ["result"],
    targetLabel: "ประชากร 35 ปีขึ้นไป",
    resultLabel: "ได้รับการคัดกรอง",
    breakdownCols: [
      { key: "normal", label: "ปกติ", sourceCols: ["normal"] },
      { key: "risk", label: "เสี่ยง", sourceCols: ["risk"] },
      { key: "high_risk", label: "สงสัยป่วย", sourceCols: ["high_risk"] },
      { key: "ill", label: "ป่วย", sourceCols: ["ill_1"] },
      // นอกเกณฑ์ = max(0, คัดกรอง - (ปกติ + เสี่ยง + สงสัยป่วย + ป่วย))
      { key: "ill_1", label: "นอกเกณฑ์", outsideCriteria: true },
    ],
  },
  "275": {
    title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน",
    tableName: "s_dm_screen_risk",
    targetCols: ["target"],
    resultCols: ["result"],
    targetLabel: "ประชากร 35 ปีขึ้นไป",
    resultLabel: "ได้รับการคัดกรอง",
    breakdownCols: [
      { key: "normal", label: "ปกติ", sourceCols: ["normal"] },
      { key: "risk", label: "เสี่ยง", sourceCols: ["risk"] },
      { key: "high_risk", label: "สงสัยป่วย", sourceCols: ["high_risk"] },
      // นอกเกณฑ์ = max(0, คัดกรอง - (ปกติ + เสี่ยง + สงสัยป่วย))
      { key: "ill", label: "นอกเกณฑ์", outsideCriteria: true },
    ],
  },
};

export const RAPID_REPORT_IDS = Object.keys(RAPID_REPORTS);

// รายการเมนู bullet ของ /rapid/index — แต่ละ report มีหน้า (route) ของตัวเอง
// href = slug ของหน้านั้น, label แบบ fix (ไม่ derive จาก report.name)
export const RAPID_MENU = [
  { id: "143", href: "/rapid/dm-control", title: "ผู้ป่วยโรคเบาหวานควบคุมระดับน้ำตาลได้ดี (DM Control)" },
  { id: "52", href: "/rapid/mmr2", title: "ความครอบคลุมวัคซีนป้องกันหัด-คางทูม-หัดเยอรมัน เข็มที่ 2 (MMR2)" },
  { id: "276", href: "/rapid/screen-ht", title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคความดันโลหิตสูง" },
  { id: "275", href: "/rapid/screen-dm", title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน" },
];

// breadcrumb entry ของ module rapid — label แบบ fix, module เป็นเจ้าของ config เอง
// ModuleHeader (shared) แค่ import มาต่อใน BREADCRUMB_MODULES
export const RAPID_BREADCRUMB = {
  prefix: "/rapid",
  href: "/rapid/index",
  label: "งานเร่งรัดติดตาม",
  pages: Object.fromEntries(RAPID_MENU.map(({ href, title }) => [href, title])),
};

// ปีงบประมาณ (พ.ศ.) ปัจจุบัน — ตั้งแต่ ต.ค. นับเป็นปีถัดไป
export function currentThaiFiscalYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const fiscalAd = month >= 10 ? year + 1 : year;
  return String(fiscalAd + 543);
}
