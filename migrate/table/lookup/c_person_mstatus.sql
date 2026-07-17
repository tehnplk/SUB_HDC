-- Source: MOPH 43-file structure doc, PERSON.MSTATUS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_mstatus` (
  `code` varchar(1) NOT NULL,
  `mstatus_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_person_mstatus`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_person_mstatus`;

INSERT INTO `c_person_mstatus` (`code`, `mstatus_name`) VALUES
  ('1', 'โสด'),
  ('2', 'คู่'),
  ('3', 'หม้าย'),
  ('4', 'หย่า'),
  ('5', 'แยก'),
  ('6', 'สมณะ'),
  ('9', 'ไม่ทราบ');

COMMIT;
