-- Source: MOPH 43-file structure doc, HOME.LOCATYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_locatype` (
  `code` varchar(1) NOT NULL,
  `locatype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_locatype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_locatype`;

INSERT INTO `c_home_locatype` (`code`, `locatype_name`) VALUES
  ('1', 'ในเขตเทศบาล'),
  ('2', 'นอกเขตเทศบาล');

COMMIT;
