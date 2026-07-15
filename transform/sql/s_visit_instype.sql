-- Service workload by source hospital, Thai fiscal year, month, and insurance code.
CREATE TABLE IF NOT EXISTS `s_visit_instype` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `month` tinyint UNSIGNED NOT NULL,
  `instype_code` varchar(4) NOT NULL,
  `count_visit` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `fiscal_year`, `month`, `instype_code`),
  KEY `idx_s_visit_instype_period_code` (`fiscal_year`, `month`, `instype_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `s_visit_instype`;

INSERT INTO `s_visit_instype`
  (`hospcode`, `fiscal_year`, `month`, `instype_code`, `count_visit`)
SELECT
  `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  CAST(SUBSTRING(`date_serv`, 5, 2) AS UNSIGNED) AS `month`,
  `instype` AS `instype_code`,
  COUNT(*) AS `count_visit`
FROM `service`
WHERE `hospcode` != ''
  AND `date_serv` REGEXP '^[0-9]{8}$'
  AND SUBSTRING(`date_serv`, 5, 2) BETWEEN '01' AND '12'
  AND `instype` != ''
GROUP BY
  `hospcode`,
  CAST(LEFT(`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END,
  CAST(SUBSTRING(`date_serv`, 5, 2) AS UNSIGNED),
  `instype`
ORDER BY NULL;

COMMIT;
