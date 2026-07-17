-- Source: user-provided PERSON discharge status codes.
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_discharge` (
  `code` varchar(1) NOT NULL,
  `person_discharge_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_person_discharge`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_person_discharge`;

INSERT INTO `c_person_discharge` (`code`, `person_discharge_name`) VALUES
  ('1', 'ตาย'),
  ('2', 'ย้าย'),
  ('3', 'สาบสูญ'),
  ('9', 'ไม่จำหน่าย');

COMMIT;
