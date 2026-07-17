-- Source: MOPH 43-file structure doc, DRUGALLERGY.TYPEDX
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_drugallergy_typedx` (
  `code` varchar(1) NOT NULL,
  `typedx_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_drugallergy_typedx`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_drugallergy_typedx`;

INSERT INTO `c_drugallergy_typedx` (`code`, `typedx_name`) VALUES
  ('1', 'certain'),
  ('2', 'probable'),
  ('3', 'possible'),
  ('4', 'unlikely'),
  ('5', 'unclassified');

COMMIT;
