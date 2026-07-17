-- Source: MOPH 43-file structure doc, FUNCTIONAL.DEPENDENT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_functional_dependent` (
  `code` varchar(1) NOT NULL,
  `dependent_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_functional_dependent`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_functional_dependent`;

INSERT INTO `c_functional_dependent` (`code`, `dependent_name`) VALUES
  ('1', 'ไม่พึ่งพิง'),
  ('2', 'พึ่งพิงน้อย'),
  ('3', 'พึ่งพิงมาก');

COMMIT;
