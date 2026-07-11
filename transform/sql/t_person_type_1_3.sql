-- Fiscal-year 2569 snapshot of active Typearea 1/3 residents.
-- Grain: one row per fiscal_year + cid.
-- All other fields are position-aligned CSV values ordered by hos + pid.

DROP TABLE IF EXISTS `t_person_type_1_3`;

CREATE TABLE `t_person_type_1_3` (
  `fiscal_year` smallint UNSIGNED NOT NULL,
  `cid` varchar(255) NOT NULL,
  `hos` text DEFAULT NULL,
  `pid` text DEFAULT NULL,
  `type` text DEFAULT NULL,
  `sex` text DEFAULT NULL,
  `bdate` text DEFAULT NULL,
  `age_y` text DEFAULT NULL,
  `age_m` text DEFAULT NULL,
  `age_d` text DEFAULT NULL,
  `inscl` text DEFAULT NULL,
  `village_id` text DEFAULT NULL,
  PRIMARY KEY (`fiscal_year`, `cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fiscal_year := 2569;
SET @fiscal_start := STR_TO_DATE('20251001', '%Y%m%d');
SET SESSION group_concat_max_len = 65535;

START TRANSACTION;

DELETE FROM `t_person_type_1_3`;

DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3`;

CREATE TEMPORARY TABLE `tmp_person_type_1_3` AS
SELECT
  @fiscal_year AS `fiscal_year`,
  p.`cid`,
  p.`hospcode` AS `hos`,
  p.`pid`,
  p.`typearea` AS `type`,
  NULLIF(p.`sex`, '') AS `sex`,
  CASE
    WHEN p.`birth` REGEXP '^[0-9]{8}$'
      AND STR_TO_DATE(p.`birth`, '%Y%m%d') IS NOT NULL
    THEN p.`birth`
    ELSE NULL
  END AS `bdate`,
  CASE
    WHEN p.`birth` REGEXP '^[0-9]{8}$'
      AND STR_TO_DATE(p.`birth`, '%Y%m%d') IS NOT NULL
      AND STR_TO_DATE(p.`birth`, '%Y%m%d') <= @fiscal_start
    THEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(p.`birth`, '%Y%m%d'), @fiscal_start)
    ELSE NULL
  END AS `age_y`,
  p.`hid`
FROM `person` p
WHERE p.`typearea` IN ('1', '3')
  AND p.`discharge` = '9';

ALTER TABLE `tmp_person_type_1_3`
  ADD KEY `idx_tmp_person_type_1_3_hos_pid` (`hos`, `pid`),
  ADD KEY `idx_tmp_person_type_1_3_hos_hid` (`hos`, `hid`);

DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3_card`;

CREATE TEMPORARY TABLE `tmp_person_type_1_3_card` AS
SELECT `hospcode`, `pid`, `instype_new`
FROM (
  SELECT
    c.`hospcode`,
    c.`pid`,
    NULLIF(c.`instype_new`, '') AS `instype_new`,
    ROW_NUMBER() OVER (
      PARTITION BY c.`hospcode`, c.`pid`
      ORDER BY c.`d_update` DESC, c.`startdate` DESC,
               c.`expiredate` DESC, c.`instype_new` DESC
    ) AS `rn`
  FROM `card` c
  JOIN `tmp_person_type_1_3` p
    ON p.`hos` = c.`hospcode` AND p.`pid` = c.`pid`
  WHERE (
      c.`startdate` = ''
      OR (c.`startdate` REGEXP '^[0-9]{8}$' AND c.`startdate` <= '20251001')
    )
    AND (
      c.`expiredate` = ''
      OR (c.`expiredate` REGEXP '^[0-9]{8}$' AND c.`expiredate` >= '20251001')
    )
) ranked_card
WHERE `rn` = 1;

ALTER TABLE `tmp_person_type_1_3_card`
  ADD PRIMARY KEY (`hospcode`, `pid`);

DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3_detail`;

CREATE TEMPORARY TABLE `tmp_person_type_1_3_detail` AS
SELECT
  p.`fiscal_year`,
  p.`cid`,
  p.`hos`,
  p.`pid`,
  p.`type`,
  p.`sex`,
  p.`bdate`,
  p.`age_y`,
  CASE
    WHEN p.`age_y` IS NULL THEN NULL
    ELSE TIMESTAMPDIFF(
      MONTH,
      DATE_ADD(STR_TO_DATE(p.`bdate`, '%Y%m%d'), INTERVAL p.`age_y` YEAR),
      @fiscal_start
    )
  END AS `age_m`,
  CASE
    WHEN p.`age_y` IS NULL THEN NULL
    ELSE DATEDIFF(
      @fiscal_start,
      DATE_ADD(
        DATE_ADD(STR_TO_DATE(p.`bdate`, '%Y%m%d'), INTERVAL p.`age_y` YEAR),
        INTERVAL TIMESTAMPDIFF(
          MONTH,
          DATE_ADD(STR_TO_DATE(p.`bdate`, '%Y%m%d'), INTERVAL p.`age_y` YEAR),
          @fiscal_start
        ) MONTH
      )
    )
  END AS `age_d`,
  c.`instype_new` AS `inscl`,
  CASE
    WHEN h.`changwat` REGEXP '^[0-9]{2}$'
      AND h.`ampur` REGEXP '^[0-9]{2}$'
      AND h.`tambon` REGEXP '^[0-9]{2}$'
      AND h.`village` REGEXP '^[0-9]{2}$'
    THEN CONCAT(h.`changwat`, h.`ampur`, h.`tambon`, h.`village`)
    ELSE NULL
  END AS `village_id`
FROM `tmp_person_type_1_3` p
LEFT JOIN `tmp_person_type_1_3_card` c
  ON c.`hospcode` = p.`hos` AND c.`pid` = p.`pid`
LEFT JOIN `home` h ON h.`hospcode` = p.`hos` AND h.`hid` = p.`hid`;

INSERT INTO `t_person_type_1_3`
  (`fiscal_year`, `cid`, `hos`, `pid`, `type`, `sex`, `bdate`, `age_y`, `age_m`, `age_d`, `inscl`, `village_id`)
SELECT
  `fiscal_year`,
  `cid`,
  GROUP_CONCAT(IFNULL(`hos`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `hos`,
  GROUP_CONCAT(IFNULL(`pid`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `pid`,
  GROUP_CONCAT(IFNULL(`type`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `type`,
  GROUP_CONCAT(IFNULL(`sex`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `sex`,
  GROUP_CONCAT(IFNULL(`bdate`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `bdate`,
  GROUP_CONCAT(IFNULL(CAST(`age_y` AS CHAR), '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `age_y`,
  GROUP_CONCAT(IFNULL(CAST(`age_m` AS CHAR), '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `age_m`,
  GROUP_CONCAT(IFNULL(CAST(`age_d` AS CHAR), '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `age_d`,
  GROUP_CONCAT(IFNULL(`inscl`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `inscl`,
  GROUP_CONCAT(IFNULL(`village_id`, '') ORDER BY `hos`, `pid` SEPARATOR ',') AS `village_id`
FROM `tmp_person_type_1_3_detail`
GROUP BY `fiscal_year`, `cid`;

COMMIT;

DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3`;
DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3_card`;
DROP TEMPORARY TABLE IF EXISTS `tmp_person_type_1_3_detail`;
