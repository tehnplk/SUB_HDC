-- ตารางเก็บ URL ระบบเสริม (add-on) ที่ลิงก์เข้าใช้งานจาก webapp
-- 1 แถว = 1 ระบบเสริม
CREATE TABLE IF NOT EXISTS `c_addon_url` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `url` varchar(500) NOT NULL,
  `system_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_c_addon_url_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
