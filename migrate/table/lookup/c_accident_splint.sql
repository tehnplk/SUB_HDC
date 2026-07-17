-- Source: MOPH 43-file structure doc, ACCIDENT.SPLINT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_splint` (
  `code` varchar(1) NOT NULL,
  `splint_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_splint`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_splint`;

INSERT INTO `c_accident_splint` (`code`, `splint_name`) VALUES
  ('1', 'มีการใส่ splint/slab ก่อนมาถึงเหมาะสม'),
  ('2', 'ไม่มีการใส่ splint/slab ก่อนมาถึง'),
  ('3', 'ไม่จำเป็น'),
  ('4', 'มีการใส่ splint/slab ก่อนมาถึงไม่เหมาะสม');

COMMIT;
