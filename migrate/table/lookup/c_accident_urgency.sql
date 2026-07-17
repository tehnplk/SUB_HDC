-- Source: MOPH 43-file structure doc, ACCIDENT.URGENCY
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_urgency` (
  `code` varchar(1) NOT NULL,
  `urgency_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_urgency`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_urgency`;

INSERT INTO `c_accident_urgency` (`code`, `urgency_name`) VALUES
  ('1', 'Resuscitation'),
  ('2', 'emergent'),
  ('3', 'urgent'),
  ('4', 'Less urgent'),
  ('5', 'non urgent');

COMMIT;
