-- Source: MOPH 43-file structure doc, HOME.MFOOD
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_mfood` (
  `code` varchar(1) NOT NULL,
  `mfood_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_mfood`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_mfood`;

INSERT INTO `c_home_mfood` (`code`, `mfood_name`) VALUES
  ('0', 'ไม่ใช้'),
  ('1', 'ใช้'),
  ('9', 'ไม่ทราบ');

COMMIT;
