-- ตัวนับจำนวนการเข้าชม (visit counter) — เก็บแถวเดียว id=1
CREATE TABLE IF NOT EXISTS `visit_counter` (
  `id` tinyint NOT NULL DEFAULT 1,
  `total` bigint NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `visit_counter` (`id`, `total`) VALUES (1, 0)
  ON DUPLICATE KEY UPDATE `id` = `id`;
