import { requireAccess } from "@/lib/access.mjs";
import { fetchReport, xlsxResponse } from "@/lib/report.mjs";
import { formatThaiDate } from "@/lib/thai-date.mjs";
import { GET as getSpecialppError } from "../route.js";

export const runtime = "nodejs";

function errorTypeLabel(value) {
  if (value === "not_standard") return "ไม่ตรงรหัสมาตรฐาน";
  if (value === "cancelled") return "รหัสยกเลิกแล้ว";
  return value || "";
}

const COLUMNS = [
  ["หน่วยบริการ", (row) => row.hospcode],
  ["ชื่อหน่วยบริการ", (row) => row.hospname],
  ["สังกัด", (row) => row.affiliation],
  ["ปีงบประมาณ", (row) => row.fiscal_year],
  ["PID", (row) => row.pid || ""],
  ["SEQ", (row) => row.seq || ""],
  ["วันที่รับบริการ", (row) => formatThaiDate(row.date_serve)],
  ["รหัส PPSPECIAL", (row) => row.ppspecial || ""],
  ["ชื่อรหัส", (row) => row.ppspecial_name || ""],
  ["สถานะ", (row) => errorTypeLabel(row.error_type)],
];

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const { data, failed } = await fetchReport(getSpecialppError, request, { details: "1" });
  if (failed) return failed;

  const hospcode = new URL(request.url).searchParams.get("hospcode");
  return xlsxResponse(COLUMNS, data.rows, {
    sheet: "specialpp_error",
    filename: `specialpp_error_${data.fiscalYear}_${hospcode}.xlsx`,
    minColWidth: 14,
  });
}
