CREATE TABLE IF NOT EXISTS `c_user_provider` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(191) NOT NULL,
  `cid_hash` varchar(128) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `hoscode` varchar(9) DEFAULT NULL,
  `role` int(10) unsigned NOT NULL,
  `login_count` int(10) unsigned NOT NULL DEFAULT 0,
  `last_activity` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `profile` longtext DEFAULT NULL CHECK (json_valid(`profile`)),
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_c_user_provider_provider_id` (`provider_id`),
  KEY `idx_c_user_provider_cid_hash` (`cid_hash`),
  KEY `idx_c_user_provider_hoscode` (`hoscode`),
  KEY `idx_c_user_provider_role_active` (`role`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `c_user_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_c_user_role_role` (`role`),
  KEY `idx_c_user_role_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO `c_user_role` (`id`, `role`, `is_active`, `note`) VALUES
  (1, 'admin', 1, 'System administrator'),
  (2, 'superuser', 1, 'All individual data'),
  (3, 'user', 1, 'Standard ProviderID user'),
  (4, 'guest', 1, 'Summary data only')
ON DUPLICATE KEY UPDATE
  `is_active` = IF(`id` = VALUES(`id`) AND `role` = VALUES(`role`), VALUES(`is_active`), `is_active`),
  `note` = IF(`id` = VALUES(`id`) AND `role` = VALUES(`role`), VALUES(`note`), `note`);
