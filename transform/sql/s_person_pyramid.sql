-- Population pyramid by service unit and five-year age band.
-- Summarizes the fiscal-year Typearea 1/3 snapshot in t_person_type_1_3.
CREATE TABLE IF NOT EXISTS `s_person_pyramid` (
  `hospcode` varchar(10) NOT NULL,
  `age_range` varchar(20) NOT NULL,
  `male` int UNSIGNED NOT NULL DEFAULT 0,
  `female` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `age_range`),
  KEY `idx_s_person_pyramid_age_range` (`age_range`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `s_person_pyramid`;

INSERT INTO `s_person_pyramid` (`hospcode`, `age_range`, `male`, `female`)
SELECT
  `hos` AS `hospcode`,
  CASE
    WHEN `age_years` >= 85 THEN '85+'
    ELSE CONCAT(FLOOR(`age_years` / 5) * 5, '-', FLOOR(`age_years` / 5) * 5 + 4)
  END AS `age_range`,
  SUM(`sex` = '1') AS `male`,
  SUM(`sex` = '2') AS `female`
FROM (
  SELECT
    hos_values.`hos`,
    sex_values.`sex`,
    CAST(NULLIF(age_values.`age_years`, '') AS UNSIGNED) AS `age_years`
  FROM `t_person_type_1_3` p
  CROSS JOIN JSON_TABLE(
    CONCAT('["', REPLACE(p.`hos`, ',', '","'), '"]'),
    '$[*]' COLUMNS (`row_no` FOR ORDINALITY, `hos` varchar(10) PATH '$')
  ) AS hos_values
  JOIN JSON_TABLE(
    CONCAT('["', REPLACE(p.`sex`, ',', '","'), '"]'),
    '$[*]' COLUMNS (`row_no` FOR ORDINALITY, `sex` varchar(1) PATH '$')
  ) AS sex_values ON sex_values.`row_no` = hos_values.`row_no`
  JOIN JSON_TABLE(
    CONCAT('["', REPLACE(p.`age_y_fiscal`, ',', '","'), '"]'),
    '$[*]' COLUMNS (`row_no` FOR ORDINALITY, `age_years` varchar(3) PATH '$')
  ) AS age_values ON age_values.`row_no` = hos_values.`row_no`
  WHERE p.`fiscal_year` = 2569
    AND sex_values.`sex` IN ('1', '2')
    AND age_values.`age_years` REGEXP '^[0-9]+$'
) AS `person_age`
WHERE `age_years` >= 0
GROUP BY `hos`, CASE WHEN `age_years` >= 85 THEN 85 ELSE FLOOR(`age_years` / 5) * 5 END;

COMMIT;
