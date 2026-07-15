export default function RapidHdcReportMeta({ loading, reportName, sourceTable }) {
  return (
    <div className="rapidHdcReportMeta">
      <span>hdc_report_name : <code>{loading ? "…" : (reportName || "-")}</code></span>
      <span>hdc_table : <code>{loading ? "…" : (sourceTable || "-")}</code></span>
    </div>
  );
}
