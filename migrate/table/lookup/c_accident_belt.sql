-- Source: MOPH 43-file structure doc, ACCIDENT.BELT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_belt` (
  `code` varchar(1) NOT NULL,
  `belt_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_belt`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_belt`;

INSERT INTO `c_accident_belt` (`code`, `belt_name`) VALUES
  ('1', 'คาด'),
  ('2', 'ไม่คาด'),
  ('9', 'ไม่ทราบ');

COMMIT;
