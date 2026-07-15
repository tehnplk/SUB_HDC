-- Monthly diabetes screening summary for Typearea 1/3 by source hospital and Thai fiscal year.
CREATE TABLE IF NOT EXISTS `s_dm_screen` (
  `hospcode` varchar(10) NOT NULL,
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `month` tinyint UNSIGNED NOT NULL,
  `dm_screen` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `fiscal_year`, `month`),
  KEY `idx_s_dm_screen_fiscal_year_month` (`fiscal_year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `s_dm_screen`;

INSERT INTO `s_dm_screen` (`hospcode`, `fiscal_year`, `month`, `dm_screen`)
SELECT
  n.`hospcode`,
  CAST(LEFT(n.`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(n.`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END AS `fiscal_year`,
  CAST(SUBSTRING(n.`date_serv`, 5, 2) AS UNSIGNED) AS `month`,
  SUM(TRIM(n.`bslevel`) <> '') AS `dm_screen`
FROM `ncdscreen` n
JOIN `t_person_type_1_3` p
  ON p.`fiscal_year` = CAST(LEFT(n.`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(n.`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END
  AND p.`cid` = n.`cid`
  AND p.`cid` <> ''
WHERE n.`hospcode` <> ''
  AND n.`date_serv` REGEXP '^[0-9]{8}$'
  AND SUBSTRING(n.`date_serv`, 5, 2) BETWEEN '01' AND '12'
GROUP BY n.`hospcode`,
  CAST(LEFT(n.`date_serv`, 4) AS UNSIGNED)
    + CASE WHEN SUBSTRING(n.`date_serv`, 5, 2) >= '10' THEN 544 ELSE 543 END,
  CAST(SUBSTRING(n.`date_serv`, 5, 2) AS UNSIGNED)
ORDER BY NULL;

COMMIT;
