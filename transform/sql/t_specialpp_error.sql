-- SPECIALPP screening codes that are either not standard (absent from the
-- c_specialpp_ppspecial lookup) or cancelled (present but is_active = 0).
-- Fiscal year 2569: 1 October 2025 through 30 September 2026.
CREATE TABLE IF NOT EXISTS `t_specialpp_error` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `pid` varchar(255) NOT NULL,
  `seq` varchar(255) NOT NULL,
  `date_serve` varchar(8) NOT NULL,
  `ppspecial` varchar(255) NOT NULL,
  `ppspecial_name` varchar(255) NOT NULL DEFAULT '',
  `error_type` varchar(20) NOT NULL,
  PRIMARY KEY (`hospcode`, `fiscal_year`, `pid`, `seq`, `date_serve`, `ppspecial`),
  KEY `idx_t_specialpp_error_date_serve` (`date_serve`),
  KEY `idx_t_specialpp_error_error_type` (`error_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Backfill ppspecial_name on installations that created the table before this column existed.
ALTER TABLE `t_specialpp_error`
  ADD COLUMN IF NOT EXISTS `ppspecial_name` varchar(255) NOT NULL DEFAULT '' AFTER `ppspecial`;

SET @fiscal_start := '20251001';
SET @next_fiscal_start := '20261001';

START TRANSACTION;

DELETE FROM `t_specialpp_error`;

INSERT INTO `t_specialpp_error`
  (`hospcode`, `fiscal_year`, `pid`, `seq`, `date_serve`, `ppspecial`, `ppspecial_name`, `error_type`)
SELECT
  s.`hospcode`,
  CAST(LEFT(s.`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(s.`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  s.`pid`,
  s.`seq`,
  s.`date_serv` AS `date_serve`,
  s.`ppspecial`,
  COALESCE(c.`ppspecial_name`, '') AS `ppspecial_name`,
  CASE WHEN c.`code` IS NULL THEN 'not_standard' ELSE 'cancelled' END AS `error_type`
FROM `specialpp` s
LEFT JOIN `c_specialpp_ppspecial` c ON TRIM(s.`ppspecial`) = TRIM(c.`code`)
WHERE s.`date_serv` >= @fiscal_start
  AND s.`date_serv` < @next_fiscal_start
  AND TRIM(s.`ppspecial`) <> ''
  AND (c.`code` IS NULL OR c.`is_active` = 0);

COMMIT;
