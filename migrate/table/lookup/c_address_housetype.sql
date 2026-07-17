-- Source: MOPH 43-file structure doc, ADDRESS.HOUSETYPE (ลักษณะที่อยู่)
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_address_housetype` (
  `code` varchar(1) NOT NULL,
  `housetype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_address_housetype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_address_housetype`;

INSERT INTO `c_address_housetype` (`code`, `housetype_name`) VALUES
  ('1', 'บ้านเดี่ยว บ้านแฝด'),
  ('2', 'ทาวน์เฮาส์ ทาวน์โฮม'),
  ('3', 'คอนโดมิเนียม'),
  ('4', 'อพาร์ทเมนท์ หอพัก'),
  ('5', 'บ้านพักคนงาน'),
  ('8', 'อื่นๆ'),
  ('9', 'ไม่ทราบ');

COMMIT;
