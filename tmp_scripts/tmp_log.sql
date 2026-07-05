SELECT id, file_name, file_size, status, import_date_time, finish_date_time, LEFT(COALESCE(not_complete_msg,''),200) as msg
FROM log_import_file
ORDER BY id DESC
LIMIT 10;
