-- Source: MOPH 43-file structure doc, HOME.VENTILATION
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_ventilation` (
  `code` varchar(1) NOT NULL,
  `ventilation_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_ventilation`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_ventilation`;

INSERT INTO `c_home_ventilation` (`code`, `ventilation_name`) VALUES
  ('0', 'ไม่ระบาย'),
  ('1', 'ระบาย'),
  ('9', 'ไม่ทราบ');

COMMIT;
