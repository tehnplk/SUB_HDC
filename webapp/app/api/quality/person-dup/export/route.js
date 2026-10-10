import { requireAccess } from "@/lib/access.mjs";
import { fetchReport, xlsxResponse } from "@/lib/report.mjs";
import { formatThaiDate, formatThaiDateTime } from "@/lib/thai-date.mjs";
import { GET as getPersonDup } from "../route.js";

export const runtime = "nodejs";

// ส่งออกกลุ่มเลขบัตรซ้ำที่มีหน่วยบริการที่เลือกอยู่ด้วย — 1 แถว = 1 ทะเบียนต่อหน่วยบริการ
// (ทุกหน่วยในกลุ่ม) ข้อมูลจาก handler ของหน้า ซึ่งไม่มี cid อยู่แล้ว
function formatSex(value) {
  if (value === "1") return "ชาย";
  if (value === "2") return "หญิง";
  return value || "";
}

function formatAge(years, months, days) {
  const values = [years, months, days];
  if (values.every((value) => value === null || value === undefined || value === "")) return "";
  return `${years || 0} ปี ${months || 0} เดือน ${days || 0} วัน`;
}

const COLUMNS = [
  ["ชื่อ", (entry) => entry.name],
  ["หน่วยบริการ", (entry) => entry.hos],
  ["ชื่อหน่วยบริการ", (entry) => entry.hospname],
  ["PID", (entry) => entry.pid],
  ["HN", (entry) => entry.hn],
  ["TYPE", (entry) => entry.type],
  ["เพศ", (entry) => formatSex(entry.sex)],
  ["วันเกิด", (entry) => formatThaiDate(entry.birth)],
  ["อายุ ณ วันเริ่มปีงบประมาณ", (entry) => formatAge(entry.age_y_fiscal, entry.age_m_fiscal, entry.age_d_fiscal)],
  ["อายุปัจจุบัน", (entry) => formatAge(entry.age_y_current, entry.age_m_current, entry.age_d_current)],
  ["ปรับปรุงล่าสุด", (entry) => formatThaiDateTime(entry.d_update)],
];

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const hospcode = new URL(request.url).searchParams.get("hospcode") || "";
  if (!hospcode) {
    return Response.json({ error: "กรุณาเลือกหน่วยบริการก่อนส่งออก" }, { status: 400 });
  }
  if (!/^\w{1,10}$/.test(hospcode)) {
    return Response.json({ error: "hospcode ไม่ถูกต้อง" }, { status: 400 });
  }

  const { data, failed } = await fetchReport(getPersonDup, request);
  if (failed) return failed;

  const entries = data.persons
    .filter((person) => person.entries.some((entry) => entry.hos === hospcode))
    .flatMap((person) => person.entries);
  return xlsxResponse(COLUMNS, entries, { sheet: "person_dup", filename: `person_dup_${hospcode}.xlsx` });
}
