import updateLog from "@/update_log.json";

export const metadata = {
  title: "Version Update Log",
};

function sortUpdateLog(entries) {
  return [...entries].sort((left, right) => (
    String(right.version || "").localeCompare(String(left.version || ""), undefined, { numeric: true })
  ));
}

export default function UpdateLogPage() {
  const rows = sortUpdateLog(updateLog);

  return (
    <div className="main dashboardMain">
      <section className="panel panelWide dashboardPanel">
        <div className="headerRow">
          <div className="titleRow">
            <div className="titleText">
              <h4 className="pageHeaderTitle">Version Update Log</h4>
            </div>
          </div>
        </div>

        <div className="tableWrap">
          <table className="fileTable">
            <thead>
              <tr>
                <th>Version</th>
                <th>Update Date</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={`${entry.version}-${entry.update_date}-${entry.issue}`}>
                  <td className="fileCol">{entry.version}</td>
                  <td>{entry.update_date}</td>
                  <td className="updateLogIssue">{entry.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
