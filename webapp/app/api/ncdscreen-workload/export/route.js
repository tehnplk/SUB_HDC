import { requireAccess } from "@/lib/access.mjs";
import { fetchReport, xlsxResponse } from "@/lib/report.mjs";
import { GET as getNcdWorkload } from "../route.js";

export const runtime = "nodejs";

export async function GET(request) {
  const { denied } = await requireAccess(request);
  if (denied) return denied;

  const metric = new URL(request.url).searchParams.get("metric") === "ht" ? "ht" : "dm";
  const { data, failed } = await fetchReport(getNcdWorkload, request);
  if (failed) return failed;

  const columns = [
    ["รหัสหน่วยบริการ", (row) => row.hospcode],
    ["หน่วยบริการ", (row) => row.hospname],
    ["สังกัด", (row) => row.affiliation],
    ...(data.months || []).map((month) => [
      `${month.label} (ครั้ง)`,
      (row) => Number(row.months?.[month.value]?.[metric] || 0),
    ]),
  ];
  return xlsxResponse(columns, data.rows || [], {
    sheet: `ncd_${metric}`,
    filename: `ncd_${metric}_workload_${data.fiscalYear || "all"}.xlsx`,
  });
}
