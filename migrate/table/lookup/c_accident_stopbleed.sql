-- Source: MOPH 43-file structure doc, ACCIDENT.STOPBLEED
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_stopbleed` (
  `code` varchar(1) NOT NULL,
  `stopbleed_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_accident_stopbleed`;

INSERT INTO `c_accident_stopbleed` (`code`, `stopbleed_name`) VALUES
  ('1', 'มีการห้ามเลือดก่อนมาถึงเหมาะสม'),
  ('2', 'ไม่มีการห้ามเลือดก่อนมาถึง'),
  ('3', 'ไม่จำเป็น'),
  ('4', 'มีการห้ามเลือดก่อนมาถึงไม่เหมาะสม');

COMMIT;
