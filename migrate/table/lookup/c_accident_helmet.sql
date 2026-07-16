-- Source: MOPH 43-file structure doc, ACCIDENT.HELMET
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_helmet` (
  `code` varchar(1) NOT NULL,
  `helmet_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_accident_helmet`;

INSERT INTO `c_accident_helmet` (`code`, `helmet_name`) VALUES
  ('1', 'สวม'),
  ('2', 'ไม่สวม'),
  ('9', 'ไม่ทราบ');

COMMIT;
