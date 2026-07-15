-- Service workload by source hospital, Thai fiscal year, and calendar month.
CREATE TABLE IF NOT EXISTS `s_visit` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `month` tinyint UNSIGNED NOT NULL,
  `visit_person` int UNSIGNED NOT NULL DEFAULT 0,
  `visit_count` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `fiscal_year`, `month`),
  KEY `idx_s_visit_fiscal_year_month` (`fiscal_year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `s_visit`;

INSERT INTO `s_visit`
  (`hospcode`, `fiscal_year`, `month`, `visit_person`, `visit_count`)
SELECT
  `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  CAST(SUBSTRING(`date_serv`, 5, 2) AS UNSIGNED) AS `month`,
  COUNT(DISTINCT NULLIF(`pid`, '')) AS `visit_person`,
  COUNT(*) AS `visit_count`
FROM `service`
WHERE `hospcode` != ''
  AND `date_serv` REGEXP '^[0-9]{8}$'
  AND SUBSTRING(`date_serv`, 5, 2) BETWEEN '01' AND '12'
GROUP BY
  `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END,
  CAST(SUBSTRING(`date_serv`, 5, 2) AS UNSIGNED)
ORDER BY NULL;

COMMIT;
