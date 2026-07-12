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
  },
  "275": {
    title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน",
    tableName: "s_dm_screen_risk",
    targetCols: ["target"],
    resultCols: ["result"],
    targetLabel: "ประชากร 35 ปีขึ้นไป",
    resultLabel: "ได้รับการคัดกรอง",
  },
};

export const RAPID_REPORT_IDS = Object.keys(RAPID_REPORTS);

// รายการเมนู bullet ของ /rapid/index — label แบบ fix (ไม่ derive จาก report.name)
export const RAPID_MENU = [
  { id: "143", title: "ผู้ป่วยโรคเบาหวานควบคุมระดับน้ำตาลได้ดี (DM Control)" },
  { id: "52", title: "ความครอบคลุมวัคซีนป้องกันหัด-คางทูม-หัดเยอรมัน เข็มที่ 2 (MMR2)" },
  { id: "276", title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคความดันโลหิตสูง" },
  { id: "275", title: "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน" },
];

// breadcrumb entry ของ module rapid — label แบบ fix, module เป็นเจ้าของ config เอง
// ModuleHeader (shared) แค่ import มาต่อใน BREADCRUMB_MODULES
export const RAPID_BREADCRUMB = {
  prefix: "/rapid",
  href: "/rapid/index",
  label: "งานเร่งรัดติดตาม",
  pages: {
    "/rapid/143": "ผู้ป่วยโรคเบาหวานควบคุมระดับน้ำตาลได้ดี (DM Control)",
    "/rapid/52": "ความครอบคลุมวัคซีนป้องกันหัด-คางทูม-หัดเยอรมัน เข็มที่ 2 (MMR2)",
    "/rapid/276": "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคความดันโลหิตสูง",
    "/rapid/275": "ประชาชนอายุ 35 ปี ขึ้นไปได้รับการคัดกรอง และเสี่ยงต่อโรคเบาหวาน",
  },
};

// ปีงบประมาณ (พ.ศ.) ปัจจุบัน — ตั้งแต่ ต.ค. นับเป็นปีถัดไป
export function currentThaiFiscalYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const fiscalAd = month >= 10 ? year + 1 : year;
  return String(fiscalAd + 543);
}
