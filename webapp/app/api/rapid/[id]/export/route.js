import * as XLSX from "xlsx";
import { loadRapidReport } from "@/app/rapid/_lib/rapid-data.mjs";

export const runtime = "nodejs";

// ส่งออกผลงานรายหน่วยบริการเป็น xlsx — ข้อมูลสรุป (ไม่มี cid) จึงไม่ต้อง login
// รองรับ filter สังกัด (?affiliation=) ให้ตรงกับที่กรองบนหน้าเว็บ
export async function GET(request, { params }) {
  const { id } = await params;
  const affiliation = new URL(request.url).searchParams.get("affiliation") || "";

  try {
    const data = await loadRapidReport(id, { affiliation });
    if (!data) return Response.json({ error: "ไม่พบตัวชี้วัดนี้" }, { status: 404 });

    const { report, year, ampName, rows } = data;
    const headers = report.breakdownCols?.length
      ? ["รหัสหน่วยบริการ", "หน่วยบริการ", "สังกัด", "อำเภอ", "เป้าหมาย", "คัดกรอง", "%คัดกรอง", "ส่วนขาด (คน)", ...report.breakdownCols.flatMap(({ label }) => report.showBreakdownPercent ? [label, "ร้อยละ"] : [label])]
      : report.controlLabel
      ? ["รหัสหน่วยบริการ", "หน่วยบริการ", "สังกัด", "อำเภอ", report.targetLabel, report.controlLabel, "% ตรวจ", report.resultLabel, "% คุมได้", "ยังไม่ได้ตรวจ"]
      : ["รหัสหน่วยบริการ", "หน่วยบริการ", "สังกัด", "อำเภอ", "เป้าหมาย", report.resultLabel, "ร้อยละ", "ส่วนขาด"];
    const aoa = [
      headers,
      ...rows.map((row) => [
        row.hospcode,
        row.hospname,
        row.affiliation,
        row.ampName,
        row.target,
        ...(report.breakdownCols?.length
          ? [row.result, Number(row.percent.toFixed(2)), row.deficit, ...report.breakdownCols.flatMap(({ key }) => report.showBreakdownPercent ? [row[key], Number(row[`${key}Percent`].toFixed(2))] : [row[key]])]
          : report.controlLabel
          ? [row.control, Number(row.screenPercent.toFixed(2)), row.result, Number(row.controlPercent.toFixed(2)), row.unexamined]
          : [row.result, Number(row.percent.toFixed(2)), row.deficit]),
      ]),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, worksheet, `rapid_${id}`.slice(0, 31));
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const suffix = affiliation ? "_filtered" : "";
    const filename = `rapid_${id}_${ampName || year}${suffix}.xlsx`;
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "ส่งออกไม่สำเร็จ" }, { status: 500 });
  }
}
