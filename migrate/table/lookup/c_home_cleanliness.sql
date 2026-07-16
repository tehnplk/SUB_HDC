-- Source: MOPH 43-file structure doc, HOME.CLEANLINESS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_cleanliness` (
  `code` varchar(1) NOT NULL,
  `cleanliness_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_cleanliness`;

INSERT INTO `c_home_cleanliness` (`code`, `cleanliness_name`) VALUES
  ('0', 'ไม่สะอาด'),
  ('1', 'สะอาด'),
  ('9', 'ไม่ทราบ');

COMMIT;
