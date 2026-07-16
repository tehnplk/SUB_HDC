-- Source: MOPH 43-file structure doc, HOME.WATERTM
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_watertm` (
  `code` varchar(1) NOT NULL,
  `watertm_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_watertm`;

INSERT INTO `c_home_watertm` (`code`, `watertm_name`) VALUES
  ('0', 'ไม่บำบัด/กำจัด'),
  ('1', 'ลงบ่อซึม'),
  ('2', 'ลงบ่อเกรอะ'),
  ('3', 'ลงระบบบำบัดน้ำเสียรวม'),
  ('9', 'ไม่ทราบ');

COMMIT;
