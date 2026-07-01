export function logImportOrderClause() {
  return `
    CASE status
      WHEN 'processing' THEN 0
      WHEN 'pending' THEN 1
      WHEN 'not_complate' THEN 2
      WHEN 'complete' THEN 3
      ELSE 4
    END,
    id DESC
  `;
}

export async function createPendingLogImportFile(connection, fileName) {
  const [result] = await connection.execute(
    "INSERT INTO `log_import_file` (`file_name`, `status`) VALUES (?, ?)",
    [fileName, "pending"]
  );
  return result.insertId;
}
