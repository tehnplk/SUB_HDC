-- Source: MOPH 43-file structure doc, NCDSCREEN.ALCOHOL
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_ncdscreen_alcohol` (
  `code` varchar(1) NOT NULL,
  `alcohol_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_ncdscreen_alcohol`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_ncdscreen_alcohol`;

INSERT INTO `c_ncdscreen_alcohol` (`code`, `alcohol_name`) VALUES
  ('1', 'ไม่ดื่ม (ไม่ดื่มในรอบ 12 เดือนที่ผ่านมา)'),
  ('2', 'ดื่มนานๆ ครั้ง (ดื่ม 1-3 วัน/เดือน หรือดื่ม 1-11 วัน/ปี)'),
  ('3', 'ดื่มเป็นครั้งคราว (ดื่ม 1-4 วัน/สัปดาห์)'),
  ('4', 'ดื่มเป็นประจำ (ดื่ม 5-7 วัน/สัปดาห์)'),
  ('9', 'ไม่ทราบ');

COMMIT;
