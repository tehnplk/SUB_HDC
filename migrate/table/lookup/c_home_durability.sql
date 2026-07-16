-- Source: MOPH 43-file structure doc, HOME.DURABILITY
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_durability` (
  `code` varchar(1) NOT NULL,
  `durability_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_durability`;

INSERT INTO `c_home_durability` (`code`, `durability_name`) VALUES
  ('0', 'ไม่คงทน'),
  ('1', 'คงทน 1-4 ปี'),
  ('2', 'คงทน 5 ปี ขึ้นไป'),
  ('9', 'ไม่ทราบ');

COMMIT;
