// ส่วนร่วมของ API รายงานที่อ่านตารางสรุปของ transform: ขอบเขตปีงบ/หน่วยบริการ/สังกัด,
// เวลา transform ล่าสุด และการตอบไฟล์ xlsx
import * as XLSX from "xlsx";
import { getHospInfoMap } from "./hos-list-query.mjs";

// เวลาจบรอบล่าสุดของไฟล์ transform — ไซต์เก่าที่ยังไม่มี log_transform ได้ null
export async function latestTransformAt(conn, sqlFile) {
  try {
    const [[latest]] = await conn.query(
      `SELECT finish_at FROM \`log_transform\`
       WHERE transform_sql_task = ? AND finish_at IS NOT NULL
       ORDER BY finish_at DESC
       LIMIT 1`,
      [sqlFile]
    );
    return latest?.finish_at || null;
  } catch {
    return null;
  }
}

function unionSql(tables, column, where = "") {
  return tables.map((table) => `SELECT ${column} FROM \`${table}\`${where}`).join(" UNION ");
}

// อ่าน query fiscalYear/hospcode/affiliation ของรายงานรายปีงบ
// tables: ตารางสรุปที่มี fiscal_year + hospcode (หลายตาราง = UNION)
// hospitalsPerYear: รายชื่อหน่วยบริการเฉพาะปีที่เลือก (ไม่งั้นทุกปี)
// ปีที่ไม่ระบุหรือไม่มีในตาราง → ปีล่าสุด; badRequest = Response 400 เมื่อหน่วยบริการ
// ไม่มีในรายงานหรือไม่อยู่ในสังกัดที่เลือก (route ที่ไม่ตรวจก็ไม่ต้องใช้)
export async function resolveReportScope(conn, searchParams, { tables, hospitalsPerYear = false, affiliationSource } = {}) {
  const requestedYear = Number(searchParams.get("fiscalYear"));
  const hospcode = searchParams.get("hospcode") || "";
  const affiliation = searchParams.get("affiliation") || "";
  const hospitalInfo = await getHospInfoMap(conn, { affiliationSource });

  const [yearRows] = await conn.query(
    `SELECT DISTINCT fiscal_year FROM (${unionSql(tables, "fiscal_year")}) report_years ORDER BY fiscal_year DESC`
  );
  const fiscalYears = yearRows.map((row) => Number(row.fiscal_year)).filter(Boolean);
  const fiscalYear = fiscalYears.includes(requestedYear) ? requestedYear : (fiscalYears[0] || null);

  const [hospRows] = await conn.query(
    `SELECT DISTINCT hospcode FROM (${unionSql(tables, "hospcode", hospitalsPerYear ? " WHERE fiscal_year = ?" : "")}) report_hospitals ORDER BY hospcode`,
    hospitalsPerYear ? tables.map(() => fiscalYear) : []
  );

  const hospitalOf = (code) => ({
    hospname: hospitalInfo[code]?.hospname || "",
    affiliation: hospitalInfo[code]?.affiliation || "",
  });
  const inAffiliation = (code) => !affiliation || hospitalOf(code).affiliation === affiliation;
  const allHospitals = hospRows.map((row) => ({ hospcode: row.hospcode, ...hospitalOf(row.hospcode) }));
  const affiliations = [...new Set(allHospitals.map((hospital) => hospital.affiliation).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "th"));

  let badRequest = null;
  if (hospcode && !allHospitals.some((hospital) => hospital.hospcode === hospcode)) {
    badRequest = Response.json({ error: "ไม่พบหน่วยบริการ" }, { status: 400 });
  } else if (hospcode && !inAffiliation(hospcode)) {
    badRequest = Response.json({ error: "หน่วยบริการไม่อยู่ในสังกัดที่เลือก" }, { status: 400 });
  }

  return {
    fiscalYear,
    fiscalYears,
    hospcode,
    affiliations,
    hospitals: allHospitals.filter((hospital) => inAffiliation(hospital.hospcode)),
    hospitalOf,
    inAffiliation,
    badRequest,
    where: hospcode ? "fiscal_year = ? AND hospcode = ?" : "fiscal_year = ?",
    values: hospcode ? [fiscalYear, hospcode] : [fiscalYear],
  };
}

// export เรียก handler ของรายงานตัวเดียวกับหน้าเว็บ → ตัวกรองและข้อมูลตรงกันเสมอ
// params: query ที่ต้องเพิ่ม (เช่น details=1); คืน { data } หรือ { failed: Response }
export async function fetchReport(handler, request, params = {}) {
  const url = new URL(request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await handler(new Request(url, { headers: request.headers }));
  const data = await response.json();
  if (response.ok) return { data };
  return { failed: Response.json({ error: data.error || "ส่งออกไม่สำเร็จ" }, { status: response.status }) };
}

// columns: [[หัวคอลัมน์, (row) => ค่า], ...] — หัวคอลัมน์เป็นแถวแรกเสมอ แม้ไม่มีข้อมูล
// minColWidth: กำหนดความกว้างคอลัมน์ตามความยาวหัวคอลัมน์ (ไม่ส่ง = ค่าเริ่มต้นของ Excel)
export function xlsxResponse(columns, rows, { sheet, filename, minColWidth }) {
  const header = columns.map(([label]) => label);
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows.map((row) => columns.map(([, value]) => value(row)))]);
  if (minColWidth) worksheet["!cols"] = header.map((label) => ({ wch: Math.max(label.length + 2, minColWidth) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet.slice(0, 31));
  return new Response(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
