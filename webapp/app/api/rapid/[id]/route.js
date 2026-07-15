import { loadRapidReport } from "@/app/rapid/_lib/rapid-data.mjs";

export const runtime = "nodejs";

const HDC_API_BASE_URL = (process.env.HDC_API_BASE_URL || "https://opendata.moph.go.th/api").replace(/\/$/, "");

async function loadHdcReportMetadata(reportId, tableName) {
  const response = await fetch(`${HDC_API_BASE_URL}/report_name/${encodeURIComponent(tableName)}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HDC report metadata ${response.status}`);

  const payload = await response.json();
  const metadata = (payload?.data || []).find(
    (row) => row?.source_table === tableName && String(row?.report_id) === String(reportId)
  );
  if (!metadata) throw new Error(`HDC report metadata not found: ${reportId}/${tableName}`);

  return {
    source_table: metadata.source_table,
    hdc_report_name: `${metadata.report_id}-${metadata.report_name}`,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const affiliation = new URL(request.url).searchParams.get("affiliation") || "";

  try {
    const data = await loadRapidReport(id, { affiliation });
    if (!data) return Response.json({ error: "ไม่พบตัวชี้วัดนี้" }, { status: 404 });

    const { report, year, ampCode, ampName, rows, summary } = data;
    const hdcMetadata = await loadHdcReportMetadata(id, report.tableName);
    return Response.json({
      id,
      title: report.title,
      tableName: report.tableName,
      ...hdcMetadata,
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
