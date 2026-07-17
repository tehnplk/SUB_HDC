-- Source: MOPH 43-file structure doc, ACCIDENT.NACROTIC_DRUG
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_nacrotic_drug` (
  `code` varchar(1) NOT NULL,
  `nacrotic_drug_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_nacrotic_drug`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_nacrotic_drug`;

INSERT INTO `c_accident_nacrotic_drug` (`code`, `nacrotic_drug_name`) VALUES
  ('1', 'ใช้'),
  ('2', 'ไม่ใช้'),
  ('9', 'ไม่ทราบ');

COMMIT;
