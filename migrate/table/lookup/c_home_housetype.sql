-- Source: MOPH 43-file structure doc, HOME.HOUSETYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_housetype` (
  `code` varchar(1) NOT NULL,
  `housetype_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_housetype`;

INSERT INTO `c_home_housetype` (`code`, `housetype_name`) VALUES
  ('1', 'บ้านเดี่ยว บ้านแฝด'),
  ('2', 'ทาวน์เฮาส์ ทาวน์โฮม'),
  ('3', 'คอนโดมิเนียม'),
  ('4', 'อพาร์ทเมนท์ หอพัก'),
  ('5', 'บ้านพักคนงาน'),
  ('6', 'ศาสนสถาน'),
  ('8', 'อื่นๆ'),
  ('9', 'ไม่ทราบ');

COMMIT;
