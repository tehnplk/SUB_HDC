CREATE TABLE IF NOT EXISTS `c_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_c_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_provider` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(191) NOT NULL,
  `cid_hash` varchar(128) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `hoscode` varchar(9) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `last_activity` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `profile` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`profile`)),
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_provider_provider_id` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `c_user_role` (`role`, `is_active`, `note`)
SELECT legacy.`name`, legacy.`is_active`, 'Migrated from c_role'
FROM `c_role` AS legacy
WHERE NOT EXISTS (
  SELECT 1 FROM `c_user_role` AS current_role WHERE current_role.`role` = legacy.`name`
);

INSERT INTO `c_user_role` (`role`, `is_active`, `note`)
SELECT DISTINCT legacy.`role`, 1, 'Migrated from user_provider'
FROM `user_provider` AS legacy
WHERE TRIM(legacy.`role`) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM `c_user_role` AS current_role WHERE current_role.`role` = legacy.`role`
  );

INSERT INTO `c_user_provider` (
  `provider_id`, `cid_hash`, `fullname`, `hoscode`, `role`, `login_count`,
  `last_activity`, `is_active`, `profile`, `note`
)
SELECT
  legacy.`provider_id`, legacy.`cid_hash`, legacy.`fullname`, legacy.`hoscode`,
  COALESCE(current_role.`id`, 4), 0,
  legacy.`last_activity`, legacy.`is_active`, legacy.`profile`, legacy.`note`
FROM `user_provider` AS legacy
LEFT JOIN `c_user_role` AS current_role ON current_role.`role` = legacy.`role`
WHERE NOT EXISTS (
  SELECT 1
  FROM `c_user_provider` AS current_provider
  WHERE current_provider.`provider_id` = legacy.`provider_id`
);

CREATE TEMPORARY TABLE `_validate_legacy_user_tables` (
  `ok` tinyint(1) NOT NULL CHECK (`ok` = 1)
);

INSERT INTO `_validate_legacy_user_tables` (`ok`)
SELECT IF(COUNT(*) = 0, 1, 0)
FROM `user_provider` AS legacy
LEFT JOIN `c_user_provider` AS current_provider
  ON current_provider.`provider_id` = legacy.`provider_id`
WHERE current_provider.`id` IS NULL;

INSERT INTO `_validate_legacy_user_tables` (`ok`)
SELECT IF(COUNT(*) = 0, 1, 0)
FROM `c_role` AS legacy
LEFT JOIN `c_user_role` AS current_role ON current_role.`role` = legacy.`name`
WHERE current_role.`id` IS NULL;

INSERT INTO `_validate_legacy_user_tables` (`ok`)
SELECT IF(COUNT(*) = 0, 1, 0)
FROM `user_provider` AS legacy
LEFT JOIN `c_user_role` AS current_role ON current_role.`role` = legacy.`role`
WHERE TRIM(legacy.`role`) <> '' AND current_role.`id` IS NULL;

DROP TEMPORARY TABLE `_validate_legacy_user_tables`;
DROP TABLE IF EXISTS `user_provider`;
DROP TABLE IF EXISTS `c_role`;
