-- ทะเบียน DM/HT: เฉพาะคนป่วย (เคยถูก dx E10*-E14* หรือ I10*-I15*) ที่เป็น
-- ประชากรในเขต (person discharge = 9, typearea 1,3) — 1 cid = 1 แถว
--   dm_code / ht_code = รหัสที่เคยถูก dx (ไม่ซ้ำ) คั่นด้วย , เช่น E11,E119
--   hos_dx_dm / hos_dx_ht = hospcode ที่เคย dx (ไม่ซ้ำ) คั่นด้วย , เรียงตาม hospcode
--   date_dx_dm / date_dx_ht = วันที่ dx ครั้งแรกของแต่ละ รพ. (YYYYMMDD) คั่นด้วย ,
--                 ตำแหน่งตรงกับ hos_dx_* เช่น hos_dx_dm=07491,10676
--                 date_dx_dm=20230626,20250109 → 07491 dx แรก 20230626
--   hos_person_type_1_3 = hospcode ที่ขึ้นทะเบียน type 1/3 คั่นด้วย , เรียงตาม hospcode
--   pid_at_hos_type_1_3 = pid ของคนนั้นในแต่ละ รพ. ตำแหน่งตรงกับ hos_person_type_1_3
--   hn / nation = hn และสัญชาติของคนนั้นในแต่ละ รพ. ตำแหน่งตรงกับ hos_person_type_1_3
-- แหล่ง dx: diagnosis_opd + diagnosis_ipd + chronic — รพ. ไหนก็ได้ ไม่จำกัดพื้นที่
-- ประชากรในเขต + ทะเบียน/pid/hn/nation อ่านจากตารางสรุป t_person_type_1_3 (ไม่แตะ
-- raw person) → ต้องรันหลัง t_person_type_1_3 เสมอ (บังคับลำดับที่ RUN_ORDER ใน
-- run_transform.js)
-- ขั้นตอน: สร้าง temp ราย dx (cid×hospcode×รหัส + วันแรก) → ยุบลงตารางจริง
-- (CREATE/DROP TEMPORARY ไม่ implicit commit จึงอยู่ใน transaction ได้ทั้งก้อน)
-- เปลี่ยนชื่อคอลัมน์ (2026-07-11) — DROP ทิ้งให้ไซต์เก่าได้ schema ใหม่
DROP TABLE IF EXISTS `t_person_dm_ht`;

CREATE TABLE `t_person_dm_ht` (
  `cid` varchar(255) NOT NULL,
  `hos_person_type_1_3` text DEFAULT NULL,
  `pid_at_hos_type_1_3` text DEFAULT NULL,
  `hn` text DEFAULT NULL,
  `nation` text DEFAULT NULL,
  `dm_code` text DEFAULT NULL,
  `hos_dx_dm` text DEFAULT NULL,
  `date_dx_dm` text DEFAULT NULL,
  `ht_code` text DEFAULT NULL,
  `hos_dx_ht` text DEFAULT NULL,
  `date_dx_ht` text DEFAULT NULL,
  PRIMARY KEY (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS `tmp_dm_ht_dx`;

-- 1) temp ราย dx: แถวละ cid×hospcode×รหัส เก็บวันที่ dx ครั้งแรก (ข้ามวันว่าง)
--    เฉพาะประชากรในเขต
CREATE TEMPORARY TABLE `tmp_dm_ht_dx` (
  `cid` varchar(255) NOT NULL,
  `hospcode` varchar(10) NOT NULL,
  `disease` varchar(2) NOT NULL,
  `diagcode` varchar(255) NOT NULL,
  `dx_date` varchar(8) DEFAULT NULL,
  KEY `idx_tmp_dm_ht_dx_cid` (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tmp_dm_ht_dx` (`cid`, `hospcode`, `disease`, `diagcode`, `dx_date`)
SELECT
  d.`cid`,
  d.`hospcode`,
  IF(d.`code` REGEXP '^E1[0-4]', 'dm', 'ht'),
  d.`code`,
  MIN(NULLIF(d.`dx_date`, ''))
FROM (
  SELECT `cid`, `hospcode`, `diagcode` AS `code`, `date_serv` AS `dx_date`
  FROM `diagnosis_opd` WHERE `diagcode` REGEXP '^E1[0-4]|^I1[0-5]'
  UNION ALL
  SELECT `cid`, `hospcode`, `diagcode`, SUBSTRING(`datetime_admit`, 1, 8)
  FROM `diagnosis_ipd` WHERE `diagcode` REGEXP '^E1[0-4]|^I1[0-5]'
  UNION ALL
  SELECT `cid`, `hospcode`, `chronic`, `date_diag`
  FROM `chronic` WHERE `chronic` REGEXP '^E1[0-4]|^I1[0-5]'
) d
-- ประชากรในเขต (discharge=9, typearea 1/3) ใช้ตารางสรุป t_person_type_1_3
-- (1 cid = 1 แถว) แทน query raw person — ต้องรันหลัง t_person_type_1_3 (ดู RUN_ORDER)
JOIN `t_person_type_1_3` p ON p.`cid` = d.`cid` AND p.`cid` <> ''
GROUP BY d.`cid`, d.`hospcode`, d.`code`;

-- 2) temp สรุประดับ รพ.: วันแรกที่แต่ละ รพ. dx โรคนั้น (ยุบข้ามรหัส)
DROP TEMPORARY TABLE IF EXISTS `tmp_dm_ht_hos`;

CREATE TEMPORARY TABLE `tmp_dm_ht_hos` (
  `cid` varchar(255) NOT NULL,
  `disease` varchar(2) NOT NULL,
  `hospcode` varchar(10) NOT NULL,
  `first_dx` varchar(8) DEFAULT NULL,
  KEY `idx_tmp_dm_ht_hos_cid` (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tmp_dm_ht_hos` (`cid`, `disease`, `hospcode`, `first_dx`)
SELECT `cid`, `disease`, `hospcode`, MIN(`dx_date`)
FROM `tmp_dm_ht_dx`
GROUP BY `cid`, `disease`, `hospcode`;

-- 3) ยุบลงตารางจริง: 1 cid = 1 แถว
--    hos_dx_* กับ date_dx_* เรียง ORDER BY hospcode เหมือนกัน ตำแหน่งจึงตรงกัน
--    (วันว่างเก็บเป็นช่องว่าง ไม่ข้าม เพื่อไม่ให้ตำแหน่งเคลื่อน)
DELETE FROM `t_person_dm_ht`;

INSERT INTO `t_person_dm_ht`
  (`cid`, `dm_code`, `hos_dx_dm`, `date_dx_dm`, `ht_code`, `hos_dx_ht`, `date_dx_ht`)
SELECT
  c.`cid`,
  c.`dm_code`,
  h.`hos_dx_dm`,
  h.`date_dx_dm`,
  c.`ht_code`,
  h.`hos_dx_ht`,
  h.`date_dx_ht`
FROM (
  SELECT
    `cid`,
    GROUP_CONCAT(DISTINCT CASE WHEN `disease` = 'dm' THEN `diagcode` END
      ORDER BY `diagcode` SEPARATOR ',') AS `dm_code`,
    GROUP_CONCAT(DISTINCT CASE WHEN `disease` = 'ht' THEN `diagcode` END
      ORDER BY `diagcode` SEPARATOR ',') AS `ht_code`
  FROM `tmp_dm_ht_dx`
  GROUP BY `cid`
) c
JOIN (
  SELECT
    `cid`,
    GROUP_CONCAT(CASE WHEN `disease` = 'dm' THEN `hospcode` END
      ORDER BY `hospcode` SEPARATOR ',') AS `hos_dx_dm`,
    GROUP_CONCAT(CASE WHEN `disease` = 'dm' THEN IFNULL(`first_dx`, '') END
      ORDER BY `hospcode` SEPARATOR ',') AS `date_dx_dm`,
    GROUP_CONCAT(CASE WHEN `disease` = 'ht' THEN `hospcode` END
      ORDER BY `hospcode` SEPARATOR ',') AS `hos_dx_ht`,
    GROUP_CONCAT(CASE WHEN `disease` = 'ht' THEN IFNULL(`first_dx`, '') END
      ORDER BY `hospcode` SEPARATOR ',') AS `date_dx_ht`
  FROM `tmp_dm_ht_hos`
  GROUP BY `cid`
) h ON h.`cid` = c.`cid`;

-- 4) เติมที่ขึ้นทะเบียน type 1/3 + pid/hn/nation ของแต่ละ รพ. จากตารางสรุป
--    t_person_type_1_3 โดยตรง (hos/pid/hn/nation เป็น CSV เรียงตำแหน่งตรงกันแล้ว
--    ที่นั่น เรียงตาม hos,pid = เรียงตาม hospcode เพราะ 1 cid ต่อ รพ. มี pid เดียว)
UPDATE `t_person_dm_ht` t
JOIN `t_person_type_1_3` p ON p.`cid` = t.`cid`
SET t.`hos_person_type_1_3` = p.`hos`,
    t.`pid_at_hos_type_1_3` = p.`pid`,
    t.`hn` = p.`hn`,
    t.`nation` = p.`nation`;

COMMIT;

DROP TEMPORARY TABLE IF EXISTS `tmp_dm_ht_dx`;
DROP TEMPORARY TABLE IF EXISTS `tmp_dm_ht_hos`;
