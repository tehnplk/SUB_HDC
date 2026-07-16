-- Source: MOPH 43-file structure doc, PERSON.RHGROUP
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_rhgroup` (
  `code` varchar(1) NOT NULL,
  `rhgroup_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_person_rhgroup`;

INSERT INTO `c_person_rhgroup` (`code`, `rhgroup_name`) VALUES
  ('1', 'positive'),
  ('2', 'negative');

COMMIT;
