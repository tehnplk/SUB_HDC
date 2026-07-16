-- Source: MOPH 43-file structure doc, NEWBORN.BPLACE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborn_bplace` (
  `code` varchar(1) NOT NULL,
  `bplace_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_newborn_bplace`;

INSERT INTO `c_newborn_bplace` (`code`, `bplace_name`) VALUES
  ('1', 'โรงพยาบาล'),
  ('2', 'สถานีอนามัย/หน่วยบริการปฐมภูมิ'),
  ('3', 'บ้าน'),
  ('4', 'ระหว่างทาง'),
  ('5', 'อื่นๆ');

COMMIT;
