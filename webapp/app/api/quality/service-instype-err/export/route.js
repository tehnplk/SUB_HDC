import { requireAccess } from "@/lib/access.mjs";
import { fetchReport, xlsxResponse } from "@/lib/report.mjs";
import { formatThaiDate } from "@/lib/thai-date.mjs";
import { GET as getServiceInstypeError } from "../route.js";

export const runtime = "nodejs";

const COLUMNS = [
  ["หน่วยบริการ", (row) => row.hospcode],
  ["ชื่อหน่วยบริการ", (row) => row.hospname],
  ["สังกัด", (row) => row.affiliation],
  ["ปีงบประมาณ", (row) => row.fiscal_year],
  ["PID", (row) => row.pid || ""],
  ["SEQ", (row) => row.seq || ""],
  ["วันที่รับบริการ", (row) => formatThaiDate(row.date_serve)],
  ["รหัสสิทธิ", (row) => row.instype || ""],
];

const SORT_KEYS = ["hospcode", "date_serve", "pid", "seq"];

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const { data, failed } = await fetchReport(getServiceInstypeError, request, { details: "1" });
  if (failed) return failed;

  // ไฟล์ส่งออกเรียงวันที่เก่า → ใหม่ (ต่างจากหน้าที่เรียงใหม่ → เก่า)
  const rows = data.rows.toSorted((left, right) => {
    for (const key of SORT_KEYS) {
      const a = String(left[key] ?? "");
      const b = String(right[key] ?? "");
      if (a !== b) return a < b ? -1 : 1;
    }
    return 0;
  });
  const hospcode = new URL(request.url).searchParams.get("hospcode");
  return xlsxResponse(COLUMNS, rows, {
    sheet: "service_instype_error",
    filename: `service_instype_error_${data.fiscalYear}_${hospcode}.xlsx`,
    minColWidth: 14,
  });
}
