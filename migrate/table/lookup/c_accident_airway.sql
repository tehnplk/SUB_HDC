-- Source: MOPH 43-file structure doc, ACCIDENT.AIRWAY
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_airway` (
  `code` varchar(1) NOT NULL,
  `airway_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_accident_airway`;

INSERT INTO `c_accident_airway` (`code`, `airway_name`) VALUES
  ('1', 'มีการดูแลการหายใจก่อนมาถึงเหมาะสม'),
  ('2', 'ไม่มีการดูแลการหายใจก่อนมาถึง'),
  ('3', 'ไม่จำเป็น'),
  ('4', 'มีการดูแลการหายใจก่อนมาถึงไม่เหมาะสม');

COMMIT;
