-- One-off cleanup for import records stuck in pending/processing
-- (import process died without updating status — see handoff/import_issue.md Issue 1).
-- Same logic the app now runs automatically via recoverStaleLogImports().

UPDATE `log_import_file`
SET `status` = 'not_complate',
    `finish_date_time` = CURRENT_TIMESTAMP,
    `not_complete_msg` = 'Import interrupted: stale record recovered by cleanup'
WHERE `status` IN ('pending', 'processing')
  AND `finish_date_time` IS NULL
  AND `import_date_time` < NOW() - INTERVAL 120 MINUTE;

SELECT `id`, `file_name`, `status`, `import_date_time`, `finish_date_time`, `not_complete_msg`
FROM `log_import_file`
ORDER BY `id`;
