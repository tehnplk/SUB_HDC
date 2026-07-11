-- Population pyramid by service unit and five-year age band.
-- Includes only active residents in Typearea 1 or 3; sex 1 = male, 2 = female.
CREATE TABLE IF NOT EXISTS `s_person_pyramid` (
  `hospcode` varchar(10) NOT NULL,
  `age_range` varchar(20) NOT NULL,
  `male` int UNSIGNED NOT NULL DEFAULT 0,
  `female` int UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`, `age_range`),
  KEY `idx_s_person_pyramid_age_range` (`age_range`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

DELETE FROM `s_person_pyramid`;

INSERT INTO `s_person_pyramid` (`hospcode`, `age_range`, `male`, `female`)
SELECT
  `hospcode`,
  CASE
    WHEN `age_years` >= 85 THEN '85+'
    ELSE CONCAT(FLOOR(`age_years` / 5) * 5, '-', FLOOR(`age_years` / 5) * 5 + 4)
  END AS `age_range`,
  SUM(`sex` = '1') AS `male`,
  SUM(`sex` = '2') AS `female`
FROM (
  SELECT
    `hospcode`,
    `sex`,
    TIMESTAMPDIFF(YEAR, STR_TO_DATE(`birth`, '%Y%m%d'), CURDATE()) AS `age_years`
  FROM `person`
  WHERE `discharge` = '9'
    AND `typearea` IN ('1', '3')
    AND `sex` IN ('1', '2')
    AND `birth` REGEXP '^[0-9]{8}$'
    AND STR_TO_DATE(`birth`, '%Y%m%d') IS NOT NULL
) AS `person_age`
WHERE `age_years` >= 0
GROUP BY `hospcode`, CASE WHEN `age_years` >= 85 THEN 85 ELSE FLOOR(`age_years` / 5) * 5 END;

COMMIT;
