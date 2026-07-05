import { IMPORT_SETTING_DEFAULTS, loadImportSettings } from "./import-config.mjs";

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

// Marks a single import as not_complate if the import process died before
// finishing. Guarded so it never overwrites a record the importer already
// finalized itself.
export async function finalizeInterruptedLogImport(connection, id, message) {
  if (!id) return false;
  const [result] = await connection.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = 'not_complate',
         \`finish_date_time\` = CURRENT_TIMESTAMP,
         \`not_complete_msg\` = ?
     WHERE \`id\` = ?
       AND \`finish_date_time\` IS NULL
       AND \`status\` IN ('pending', 'processing')`,
    [message, id]
  );
  return result.affectedRows > 0;
}

export const IMPORT_STALE_MINUTES_DEFAULT = IMPORT_SETTING_DEFAULTS.staleMinutes;

export function importStaleMinutes() {
  return loadImportSettings().staleMinutes;
}

// Sweeps records stuck in pending/processing (importer crashed, container
// restarted, connection lost) so they stop blocking the queue view.
export async function recoverStaleLogImports(connection, staleMinutes = importStaleMinutes()) {
  const [result] = await connection.execute(
    `UPDATE \`log_import_file\`
     SET \`status\` = 'not_complate',
         \`finish_date_time\` = CURRENT_TIMESTAMP,
         \`not_complete_msg\` = 'Import interrupted: stale record recovered by cleanup'
     WHERE \`status\` IN ('pending', 'processing')
       AND \`finish_date_time\` IS NULL
       AND \`import_date_time\` < NOW() - INTERVAL ? MINUTE`,
    [staleMinutes]
  );
  return result.affectedRows;
}
