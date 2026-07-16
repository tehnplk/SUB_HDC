-- Source: MOPH 43-file structure doc, NCDSCREEN.BSTEST
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_ncdscreen_bstest` (
  `code` varchar(1) NOT NULL,
  `bstest_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_ncdscreen_bstest`;

INSERT INTO `c_ncdscreen_bstest` (`code`, `bstest_name`) VALUES
  ('1', 'ตรวจน้ำตาลในเลือด จากหลอดเลือดดำ หลังอดอาหาร'),
  ('2', 'ตรวจน้ำตาลในเลือด จากหลอดเลือดดำ โดยไม่อดอาหาร'),
  ('3', 'ตรวจน้ำตาลในเลือด จากเส้นเลือดฝอย หลังอดอาหาร'),
  ('4', 'ตรวจน้ำตาลในเลือด จากเส้นเลือดฝอย โดยไม่อดอาหาร'),
  ('9', 'ไม่ตรวจน้ำตาลในเลือดเนื่องจากคัดกรองแบบสอบถามปากเปล่าปกติ');

COMMIT;
