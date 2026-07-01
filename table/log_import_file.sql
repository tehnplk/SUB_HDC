CREATE TABLE `log_import_file` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  `status` enum('pending','processing','complete','not_complate') NOT NULL DEFAULT 'pending',
  `finish_date_time` datetime DEFAULT NULL,
  `not_complete_msg` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
