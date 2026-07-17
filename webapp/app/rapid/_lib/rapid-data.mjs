import { createDbConnection } from "@/lib/db";
import { RAPID_REPORTS, currentThaiFiscalYear } from "@/app/rapid/_lib/rapid-reports.mjs";

// โหลด + สรุปข้อมูล report จาก HDC opendata API (live) รายหน่วยบริการ
// ใช้ร่วมกันระหว่าง GET (JSON) และ export (xlsx)

const HDC_API_URL = (process.env.HDC_API_BASE_URL || "https://opendata.moph.go.th/api").replace(/\/$/, "") + "/report_data";
const HDC_PROVINCE = process.env.HDC_API_PROVINCE || "65";
// อำเภอของหน่วยบริการ — fix จาก .env แสดงเฉพาะอำเภอนี้
const AMP_CODE = String(process.env.AMP_CODE || "").trim();

function sumCols(row, cols) {
  let total = 0;
  for (const col of cols) total += Number(row?.[col] || 0);
  return total;
}

// ชื่อย่อ + อำเภอ + สังกัด ราย hospcode — สังกัดมาจาก c_hostype (join ด้วย hostype_new)
// เพื่อให้ครบทุกหน่วย (c_hospital.dep_name ว่างในหลายหน่วย) — คืน {} ถ้าตารางยังไม่มี
async function getHospInfoMap(conn) {
  try {
    const [rows] = await conn.query(
      `SELECT h.hospcode, h.hospname_short, h.amp_code, h.amp_name,
              COALESCE(NULLIF(t.hostype_name, ''), NULLIF(h.dep_name, '')) AS affiliation
       FROM c_hospital h
       LEFT JOIN c_hostype t ON t.code = h.hostype_new
       WHERE h.hospcode IS NOT NULL AND h.hospcode != ''`
    );
    const map = {};
    for (const row of rows) {
      const dep = String(row.affiliation || "").trim();
      map[row.hospcode] = {
        hospname: row.hospname_short || "",
        ampCode: row.amp_code || "",
        ampName: row.amp_name || "",
        affiliation: dep === "-" ? "" : dep,
      };
    }
    return map;
  } catch {
    return {};
  }
}

function computeSummary(rows) {
  const target = rows.reduce((sum, row) => sum + row.target, 0);
  const result = rows.reduce((sum, row) => sum + row.result, 0);
  const control = rows.reduce((sum, row) => sum + row.control, 0);
  return {
    units: rows.length,
    target,
    result,
    control,
    screenPercent: target > 0 ? (control / target) * 100 : 0,
    // % คุมได้ = คุมได้ดี * 100 / ผู้ป่วยทั้งหมด (target) ไม่ใช่เฉพาะผู้ได้รับการตรวจ
    controlPercent: target > 0 ? (result / target) * 100 : 0,
    unexamined: target - control,
    percent: target > 0 ? (result / target) * 100 : 0,
    deficit: target - result,
  };
}

// คืน null ถ้า id ไม่รู้จัก; ไม่งั้นคืน { report, year, ampCode, ampName, rows, summary }
// รองรับ filter สังกัด (affiliation) — ใช้ทั้งฝั่งแสดงผลและ export
export async function loadRapidReport(id, { affiliation = "" } = {}) {
  const report = RAPID_REPORTS[id];
  if (!report) return null;

  const year = currentThaiFiscalYear();
  const response = await fetch(HDC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ tableName: report.tableName, year, province: HDC_PROVINCE, type: "json" }),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HDC API ${response.status}: ${text.slice(0, 200)}`);
  const payload = JSON.parse(text);
  if (!Array.isArray(payload)) throw new Error("รูปแบบข้อมูลจาก HDC ไม่ถูกต้อง");

  // รวมราย hospcode (payload เป็นราย hospcode+areacode รายเดือน)
  const byHospcode = new Map();
  for (const row of payload) {
    const hospcode = String(row?.hospcode || "").trim();
    if (!hospcode) continue;
    const acc = byHospcode.get(hospcode) || { target: 0, result: 0, control: 0 };
    acc.target += sumCols(row, report.targetCols);
    acc.result += sumCols(row, report.resultCols);
    acc.control += sumCols(row, report.controlCols || []);
    for (const { key, sourceCols, outsideCriteria } of report.breakdownCols || []) {
      if (outsideCriteria) continue; // คำนวณทีหลังจากยอดรวม
      acc[key] = (acc[key] || 0) + sumCols(row, sourceCols || [key]);
    }
    byHospcode.set(hospcode, acc);
  }

  // คอลัมน์ "นอกเกณฑ์" = max(0, ผลงาน - ผลรวม breakdown อื่น) คำนวณบนยอดรวมรายหน่วย
  const outsideCols = (report.breakdownCols || []).filter((column) => column.outsideCriteria);
  if (outsideCols.length) {
    const classifiedCols = (report.breakdownCols || []).filter((column) => !column.outsideCriteria);
    for (const acc of byHospcode.values()) {
      const classified = classifiedCols.reduce((sum, column) => sum + (acc[column.key] || 0), 0);
      for (const { key } of outsideCols) acc[key] = Math.max(0, (acc.result || 0) - classified);
    }
  }

  let conn;
  try {
    conn = await createDbConnection();
    const hospInfo = await getHospInfoMap(conn);

    const rows = Array.from(byHospcode.entries())
      .map(([hospcode, acc]) => {
        const info = hospInfo[hospcode] || {};
        return {
          hospcode,
          hospname: info.hospname || "",
          affiliation: info.affiliation || "",
          ampCode: info.ampCode || "",
          ampName: info.ampName || "",
          target: acc.target,
          result: acc.result,
          control: acc.control,
          screenPercent: acc.target > 0 ? (acc.control / acc.target) * 100 : 0,
          controlPercent: acc.target > 0 ? (acc.result / acc.target) * 100 : 0,
          unexamined: acc.target - acc.control,
          percent: acc.target > 0 ? (acc.result / acc.target) * 100 : 0,
          deficit: acc.target - acc.result,
          ...Object.fromEntries((report.breakdownCols || []).map(({ key }) => [key, acc[key] || 0])),
          ...Object.fromEntries((report.breakdownCols || []).map(({ key }) => [`${key}Percent`, acc.result > 0 ? (acc[key] || 0) / acc.result * 100 : 0])),
        };
      })
      // fix เฉพาะอำเภอของหน่วยบริการตาม .env AMP_CODE + filter สังกัดถ้าระบุ
      .filter((row) => (!AMP_CODE || row.ampCode === AMP_CODE) && (!affiliation || row.affiliation === affiliation))
      .sort((left, right) => left.hospcode.localeCompare(right.hospcode));

    const ampName = rows.find((row) => row.ampCode === AMP_CODE)?.ampName || "";

    return { report, year, ampCode: AMP_CODE, ampName, rows, summary: computeSummary(rows) };
  } finally {
    if (conn) await conn.end();
  }
}
