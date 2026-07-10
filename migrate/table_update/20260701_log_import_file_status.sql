ALTER TABLE `log_import_file`
  ADD COLUMN IF NOT EXISTS `status` enum('pending','processing','complete','not_complate') NOT NULL DEFAULT 'pending' AFTER `import_date_time`;

ALTER TABLE `log_import_file`
  MODIFY COLUMN `status` enum('pending','processing','complete','not_complate') NOT NULL DEFAULT 'pending';

ALTER TABLE `log_import_file`
  ADD COLUMN IF NOT EXISTS `finish_date_time` datetime DEFAULT NULL AFTER `status`;

ALTER TABLE `log_import_file`
  ADD COLUMN IF NOT EXISTS `not_complete_msg` text DEFAULT NULL AFTER `finish_date_time`;
