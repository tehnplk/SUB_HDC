-- Source: MOPH 43-file structure doc, NCDSCREEN.SMOKE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_ncdscreen_smoke` (
  `code` varchar(1) NOT NULL,
  `smoke_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_ncdscreen_smoke`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_ncdscreen_smoke`;

INSERT INTO `c_ncdscreen_smoke` (`code`, `smoke_name`) VALUES
  ('1', 'ไม่สูบ'),
  ('2', 'สูบนานๆครั้ง'),
  ('3', 'สูบเป็นครั้งคราว'),
  ('4', 'สูบเป็นประจำ'),
  ('9', 'ไม่ทราบ');

COMMIT;
