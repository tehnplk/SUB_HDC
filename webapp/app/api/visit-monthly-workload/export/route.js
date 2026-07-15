import * as XLSX from "xlsx";
import { requireExcelExportAccess } from "@/lib/auth-guard.mjs";
import { GET as getVisitWorkload } from "../route.js";

export const runtime = "nodejs";

export async function GET(request) {
  const exportDenied = await requireExcelExportAccess();
  if (exportDenied) return exportDenied;

  try {
    const dataResponse = await getVisitWorkload(request);
    const data = await dataResponse.json();
    if (!dataResponse.ok) {
      return Response.json({ error: data.error || "ส่งออกไม่สำเร็จ" }, { status: dataResponse.status });
    }

    const headers = [
      "รหัสหน่วยบริการ",
      "หน่วยบริการ",
      "สังกัด",
      ...(data.months || []).flatMap((month) => [`${month.label} (คน)`, `${month.label} (ครั้ง)`]),
    ];
    const rows = (data.rows || []).map((row) => [
      row.hospcode,
      row.hospname,
      row.affiliation,
      ...(data.months || []).flatMap((month) => {
        const value = row.months?.[month.value] || {};
        return [Number(value.visitPerson || 0), Number(value.visitCount || 0)];
      }),
    ]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "visit_workload");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `visit_workload_${data.fiscalYear || "all"}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "ส่งออกไม่สำเร็จ" }, { status: 500 });
  }
}
