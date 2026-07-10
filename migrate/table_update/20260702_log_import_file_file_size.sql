ALTER TABLE `log_import_file` ADD COLUMN IF NOT EXISTS `file_size` bigint(20) DEFAULT NULL AFTER `file_name`;
