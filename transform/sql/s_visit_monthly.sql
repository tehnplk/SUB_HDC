-- Fiscal-year service-visit summary, grouped by source hospital.
-- The transform daemon runs only when no import is pending or processing.
CREATE TABLE IF NOT EXISTS `s_visit_monthly` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `oct` int UNSIGNED NOT NULL DEFAULT 0,
  `nov` int UNSIGNED NOT NULL DEFAULT 0,
  `dec` int UNSIGNED NOT NULL DEFAULT 0,
  `jan` int UNSIGNED NOT NULL DEFAULT 0,
  `feb` int UNSIGNED NOT NULL DEFAULT 0,
  `mar` int UNSIGNED NOT NULL DEFAULT 0,
  `apr` int UNSIGNED NOT NULL DEFAULT 0,
  `may` int UNSIGNED NOT NULL DEFAULT 0,
  `jun` int UNSIGNED NOT NULL DEFAULT 0,
  `jul` int UNSIGNED NOT NULL DEFAULT 0,
  `aug` int UNSIGNED NOT NULL DEFAULT 0,
  `sep` int UNSIGNED NOT NULL DEFAULT 0,
  `total` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `fiscal_year`),
  KEY `idx_s_visit_monthly_fiscal_year` (`fiscal_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- One-time in-place migration from the prior calendar-month layout.
SET @needs_visit_monthly_migration := (
  SELECT COUNT(*) > 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 's_visit_monthly'
    AND column_name = 'year_month'
);
SET @visit_monthly_clear_sql := IF(
  @needs_visit_monthly_migration,
  'DELETE FROM `s_visit_monthly`',
  'SELECT 1'
);
PREPARE clear_visit_monthly FROM @visit_monthly_clear_sql;
EXECUTE clear_visit_monthly;
DEALLOCATE PREPARE clear_visit_monthly;
SET @visit_monthly_migration_sql := IF(
  @needs_visit_monthly_migration,
  'ALTER TABLE `s_visit_monthly`
     DROP PRIMARY KEY,
     DROP COLUMN `year_month`,
     DROP COLUMN `visit_count`,
     ADD COLUMN `fiscal_year` smallint UNSIGNED NOT NULL AFTER `hospcode`,
     ADD COLUMN `oct` int UNSIGNED NOT NULL DEFAULT 0 AFTER `fiscal_year`,
     ADD COLUMN `nov` int UNSIGNED NOT NULL DEFAULT 0 AFTER `oct`,
     ADD COLUMN `dec` int UNSIGNED NOT NULL DEFAULT 0 AFTER `nov`,
     ADD COLUMN `jan` int UNSIGNED NOT NULL DEFAULT 0 AFTER `dec`,
     ADD COLUMN `feb` int UNSIGNED NOT NULL DEFAULT 0 AFTER `jan`,
     ADD COLUMN `mar` int UNSIGNED NOT NULL DEFAULT 0 AFTER `feb`,
     ADD COLUMN `apr` int UNSIGNED NOT NULL DEFAULT 0 AFTER `mar`,
     ADD COLUMN `may` int UNSIGNED NOT NULL DEFAULT 0 AFTER `apr`,
     ADD COLUMN `jun` int UNSIGNED NOT NULL DEFAULT 0 AFTER `may`,
     ADD COLUMN `jul` int UNSIGNED NOT NULL DEFAULT 0 AFTER `jun`,
     ADD COLUMN `aug` int UNSIGNED NOT NULL DEFAULT 0 AFTER `jul`,
     ADD COLUMN `sep` int UNSIGNED NOT NULL DEFAULT 0 AFTER `aug`,
     ADD COLUMN `total` int UNSIGNED NOT NULL DEFAULT 0 AFTER `sep`,
     ADD PRIMARY KEY (`hospcode`, `fiscal_year`),
     ADD KEY `idx_s_visit_monthly_fiscal_year` (`fiscal_year`)',
  'SELECT 1'
);
PREPARE migrate_visit_monthly FROM @visit_monthly_migration_sql;
EXECUTE migrate_visit_monthly;
DEALLOCATE PREPARE migrate_visit_monthly;

START TRANSACTION;

DELETE FROM `s_visit_monthly`;

INSERT INTO `s_visit_monthly`
  (`hospcode`, `fiscal_year`, `oct`, `nov`, `dec`, `jan`, `feb`, `mar`, `apr`, `may`, `jun`, `jul`, `aug`, `sep`, `total`)
SELECT
  `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '10') AS `oct`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '11') AS `nov`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '12') AS `dec`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '01') AS `jan`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '02') AS `feb`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '03') AS `mar`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '04') AS `apr`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '05') AS `may`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '06') AS `jun`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '07') AS `jul`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '08') AS `aug`,
  SUM(SUBSTRING(`date_serv`, 5, 2) = '09') AS `sep`,
  COUNT(*) AS `total`
FROM `service`
WHERE `hospcode` != ''
  AND `date_serv` REGEXP '^[0-9]{8}$'
  AND SUBSTRING(`date_serv`, 5, 2) BETWEEN '01' AND '12'
GROUP BY `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END
ORDER BY NULL;

COMMIT;
