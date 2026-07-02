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

export async function createPendingLogImportFile(connection, fileName, fileSize = null) {
  const [result] = await connection.execute(
    "INSERT INTO `log_import_file` (`file_name`, `file_size`, `status`) VALUES (?, ?, ?)",
    [fileName, fileSize, "pending"]
  );
  return result.insertId;
}
