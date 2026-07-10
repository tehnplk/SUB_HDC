-- Monthly service-visit summary, grouped by source hospital and calendar month.
-- The transform daemon runs only when no import is pending or processing.
CREATE TABLE IF NOT EXISTS `s_visit_montly` (
  `hospcode` varchar(10) NOT NULL,
  `year_month` char(6) NOT NULL,
  `visit_count` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `year_month`),
  KEY `idx_s_visit_montly_year_month` (`year_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

DELETE FROM `s_visit_montly`;

INSERT INTO `s_visit_montly` (`hospcode`, `year_month`, `visit_count`)
SELECT
  `hospcode`,
  LEFT(`date_serv`, 6) AS `year_month`,
  COUNT(*) AS `visit_count`
FROM `service`
WHERE `hospcode` != ''
  AND `date_serv` REGEXP '^[0-9]{8}$'
GROUP BY `hospcode`, LEFT(`date_serv`, 6);

COMMIT;
