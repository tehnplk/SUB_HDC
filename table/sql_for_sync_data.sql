CREATE TABLE IF NOT EXISTS `sql_for_sync_data` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `kpi_name` varchar(255) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `kpi_group` varchar(255) DEFAULT NULL,
  `interval_minute` int DEFAULT NULL,
  `tables_use` json NOT NULL,
  `sql_command` longtext NOT NULL,
  `note` text DEFAULT NULL,
  `d_update` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sql_for_sync_data_topic` (`topic`),
  KEY `idx_sql_for_sync_data_kpi_name` (`kpi_name`),
  KEY `idx_sql_for_sync_data_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
