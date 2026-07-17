-- Source: MOPH 43-file structure doc, HOME.WATERTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_watertype` (
  `code` varchar(1) NOT NULL,
  `watertype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_watertype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_watertype`;

INSERT INTO `c_home_watertype` (`code`, `watertype_name`) VALUES
  ('1', 'น้ำฝน'),
  ('2', 'น้ำประปา'),
  ('3', 'น้ำบาดาล'),
  ('4', 'บ่อน้ำตื้น'),
  ('5', 'สระน้ำ แม่น้ำ'),
  ('6', 'น้ำบรรจุเสร็จ'),
  ('7', 'น้ำตู้หยอดเหรียญ'),
  ('9', 'ไม่ทราบ');

COMMIT;
