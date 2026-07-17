-- Source: MOPH 43-file structure doc, HOME.LIGHT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_light` (
  `code` varchar(1) NOT NULL,
  `light_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_light`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_light`;

INSERT INTO `c_home_light` (`code`, `light_name`) VALUES
  ('0', 'ไม่เพียงพอ'),
  ('1', 'เพียงพอ'),
  ('9', 'ไม่ทราบ');

COMMIT;
