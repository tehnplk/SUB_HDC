SELECT status, COUNT(*) as cnt FROM log_import_file GROUP BY status;
SELECT file_name, status, import_date_time, finish_date_time, LEFT(not_complete_msg, 80) as error FROM log_import_file WHERE status IN ('processing','not_complate') ORDER BY id;
