-- HDC Open Data report metadata from GET /api/report/{cat_id}
CREATE TABLE IF NOT EXISTS `hdc_api_report` (
  `id` varchar(64) NOT NULL,
  `report_id` int NOT NULL,
  `report_name` varchar(500) NOT NULL,
  `cat_id` varchar(64) NOT NULL,
  `source_table` varchar(255) DEFAULT NULL,
  `main_report_id` varchar(64) DEFAULT NULL,
  `category_name` varchar(500) DEFAULT NULL,
  `main_report_name` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hdc_api_report_cat_id` (`cat_id`),
  KEY `idx_hdc_api_report_source_table` (`source_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
