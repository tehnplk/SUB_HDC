-- Source: MOPH 43-file structure doc, PERSON.FSTATUS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_fstatus` (
  `code` varchar(1) NOT NULL,
  `fstatus_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_person_fstatus`;

INSERT INTO `c_person_fstatus` (`code`, `fstatus_name`) VALUES
  ('1', 'เจ้าบ้าน'),
  ('2', 'ผู้อาศัย');

COMMIT;
