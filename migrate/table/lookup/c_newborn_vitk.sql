-- Source: MOPH 43-file structure doc, NEWBORN.VITK
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborn_vitk` (
  `code` varchar(1) NOT NULL,
  `vitk_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_newborn_vitk`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_newborn_vitk`;

INSERT INTO `c_newborn_vitk` (`code`, `vitk_name`) VALUES
  ('1', 'ได้รับ'),
  ('2', 'ไม่ได้รับ'),
  ('9', 'ไม่ทราบ');

COMMIT;
