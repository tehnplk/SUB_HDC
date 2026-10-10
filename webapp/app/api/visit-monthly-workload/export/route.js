import { requireAccess } from "@/lib/access.mjs";
import { fetchReport, xlsxResponse } from "@/lib/report.mjs";
import { GET as getVisitWorkload } from "../route.js";

export const runtime = "nodejs";

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const { data, failed } = await fetchReport(getVisitWorkload, request);
  if (failed) return failed;

  const columns = [
    ["รหัสหน่วยบริการ", (row) => row.hospcode],
    ["หน่วยบริการ", (row) => row.hospname],
    ["สังกัด", (row) => row.affiliation],
    ...(data.months || []).flatMap((month) => [
      [`${month.label} (คน)`, (row) => Number(row.months?.[month.value]?.visitPerson || 0)],
      [`${month.label} (ครั้ง)`, (row) => Number(row.months?.[month.value]?.visitCount || 0)],
    ]),
  ];
  return xlsxResponse(columns, data.rows || [], {
    sheet: "visit_workload",
    filename: `visit_workload_${data.fiscalYear || "all"}.xlsx`,
  });
}
