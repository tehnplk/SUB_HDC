-- Source: MOPH 43-file structure doc, PERSON.ABOGROUP
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_abogroup` (
  `code` varchar(1) NOT NULL,
  `abogroup_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_person_abogroup`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_person_abogroup`;

INSERT INTO `c_person_abogroup` (`code`, `abogroup_name`) VALUES
  ('1', 'A'),
  ('2', 'B'),
  ('3', 'AB'),
  ('4', 'O'),
  ('9', 'ไม่ทราบ');

COMMIT;
