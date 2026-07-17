-- Source: MOPH 43-file structure doc, ACCIDENT.FLUID
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_fluid` (
  `code` varchar(1) NOT NULL,
  `fluid_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_fluid`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_fluid`;

INSERT INTO `c_accident_fluid` (`code`, `fluid_name`) VALUES
  ('1', 'มีการให้ IV fluid ก่อนมาถึงเหมาะสม'),
  ('2', 'ไม่มีการให้ IV fluid ก่อนมาถึง'),
  ('3', 'ไม่จำเป็น'),
  ('4', 'มีการให้ IV fluid ก่อนมาถึงไม่เหมาะสม');

COMMIT;
