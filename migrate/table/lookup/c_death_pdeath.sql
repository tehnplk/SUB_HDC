-- Source: MOPH 43-file structure doc, DEATH.PDEATH (สถานที่ตาย)
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_death_pdeath` (
  `code` varchar(1) NOT NULL,
  `pdeath_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_death_pdeath`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_death_pdeath`;

INSERT INTO `c_death_pdeath` (`code`, `pdeath_name`) VALUES
  ('1', 'ในหน่วยบริการ'),
  ('2', 'นอกหน่วยบริการ');

COMMIT;
