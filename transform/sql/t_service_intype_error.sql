-- SERVICE entitlement codes that are absent from the c_instype lookup.
-- Fiscal year 2569: 1 October 2025 through 30 September 2026.
CREATE TABLE IF NOT EXISTS `t_service_intype_error` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `pid` varchar(255) NOT NULL,
  `seq` varchar(255) NOT NULL,
  `date_serve` varchar(8) NOT NULL,
  `instype` varchar(255) NOT NULL,
  PRIMARY KEY (`hospcode`, `fiscal_year`, `pid`, `seq`, `date_serve`, `instype`),
  KEY `idx_t_service_intype_error_date_serve` (`date_serve`),
  KEY `idx_t_service_intype_error_instype` (`instype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

SET @fiscal_start := '20251001';
SET @next_fiscal_start := '20261001';

START TRANSACTION;

DELETE FROM `t_service_intype_error`;

INSERT INTO `t_service_intype_error`
  (`hospcode`, `fiscal_year`, `pid`, `seq`, `date_serve`, `instype`)
SELECT
  s.`hospcode`,
  CAST(LEFT(s.`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(s.`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  s.`pid`,
  s.`seq`,
  s.`date_serv` AS `date_serve`,
  s.`instype`
FROM `service` s
LEFT JOIN `c_instype` c ON TRIM(s.`instype`) = TRIM(c.`code`)
WHERE s.`date_serv` >= @fiscal_start
  AND s.`date_serv` < @next_fiscal_start
  AND c.`code` IS NULL;

COMMIT;
