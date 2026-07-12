import { loadRapidReport } from "@/app/rapid/_lib/rapid-data.mjs";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  const affiliation = new URL(request.url).searchParams.get("affiliation") || "";

  try {
    const data = await loadRapidReport(id, { affiliation });
    if (!data) return Response.json({ error: "ไม่พบตัวชี้วัดนี้" }, { status: 404 });

    const { report, year, ampCode, ampName, rows, summary } = data;
    return Response.json({
      id,
      title: report.title,
      tableName: report.tableName,
      targetLabel: report.targetLabel,
      resultLabel: report.resultLabel,
      controlLabel: report.controlLabel || "",
      breakdownCols: report.breakdownCols || [],
      showBreakdownPercent: Boolean(report.showBreakdownPercent),
      year,
      fetchedAt: new Date().toISOString(),
      ampCode,
      ampName,
      rows,
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message || "ดึงข้อมูลจาก HDC ไม่สำเร็จ" }, { status: 500 });
  }
}
