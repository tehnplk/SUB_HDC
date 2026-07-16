-- Source: MOPH 43-file structure doc, PERSON.SEX
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_sex` (
  `code` varchar(1) NOT NULL,
  `sex_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_person_sex`;

INSERT INTO `c_person_sex` (`code`, `sex_name`) VALUES
  ('1', 'ชาย'),
  ('2', 'หญิง');

COMMIT;
