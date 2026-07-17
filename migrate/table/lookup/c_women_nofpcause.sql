-- Source: MOPH 43-file official code sheet (healthinformationmoph Google Drive), WOMEN.NOFPCAUSE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_women_nofpcause` (
  `code` varchar(1) NOT NULL,
  `nofpcause_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_women_nofpcause`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_women_nofpcause`;

INSERT INTO `c_women_nofpcause` (`code`, `nofpcause_name`) VALUES
  ('1', 'ต้องการมีบุตร'),
  ('2', 'หมันธรรมชาติ'),
  ('3', 'อื่น ๆ');

COMMIT;
