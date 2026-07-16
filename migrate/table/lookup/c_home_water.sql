-- Source: MOPH 43-file structure doc, HOME.WATER
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_water` (
  `code` varchar(1) NOT NULL,
  `water_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_water`;

INSERT INTO `c_home_water` (`code`, `water_name`) VALUES
  ('0', 'ไม่เพียงพอ'),
  ('1', 'เพียงพอ'),
  ('9', 'ไม่ทราบ');

COMMIT;
