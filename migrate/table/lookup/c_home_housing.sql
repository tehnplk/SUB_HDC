-- Source: MOPH 43-file structure doc, HOME.HOUSING
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_housing` (
  `code` varchar(1) NOT NULL,
  `housing_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_housing`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_housing`;

INSERT INTO `c_home_housing` (`code`, `housing_name`) VALUES
  ('0', 'ไม่ถูก'),
  ('1', 'ถูก'),
  ('9', 'ไม่ทราบ');

COMMIT;
