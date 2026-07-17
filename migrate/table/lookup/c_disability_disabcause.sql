-- Source: MOPH 43-file official code sheet (healthinformationmoph Google Drive), DISABILITY.DISABCAUSE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_disability_disabcause` (
  `code` varchar(1) NOT NULL,
  `disabcause_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_disability_disabcause`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_disability_disabcause`;

INSERT INTO `c_disability_disabcause` (`code`, `disabcause_name`) VALUES
  ('1', 'ความพิการแต่กำเนิด'),
  ('2', 'ความพิการจากการบาดเจ็บ'),
  ('3', 'ความพิการจากโรค');

COMMIT;
