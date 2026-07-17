-- Source: MOPH 43-file structure doc, LABOR.BTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_labor_btype` (
  `code` varchar(1) NOT NULL,
  `btype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_labor_btype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_labor_btype`;

INSERT INTO `c_labor_btype` (`code`, `btype_name`) VALUES
  ('1', 'NORMAL'),
  ('2', 'CESAREAN'),
  ('3', 'VACUUM'),
  ('4', 'FORCEPS'),
  ('5', 'ท่าก้น'),
  ('6', 'ABORTION');

COMMIT;
