ALTER TABLE `log_import_file` ADD COLUMN IF NOT EXISTS `progress_percent` int(11) DEFAULT NULL AFTER `status`;
