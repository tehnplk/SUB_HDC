-- Source: MOPH 43-file structure doc, NEWBORN.BIRTHNO
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborn_birthno` (
  `code` varchar(1) NOT NULL,
  `birthno_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_newborn_birthno`;

INSERT INTO `c_newborn_birthno` (`code`, `birthno_name`) VALUES
  ('1', 'คลอดเดี่ยว'),
  ('2', 'เป็นเด็กแฝดลำดับที่ 1'),
  ('3', 'เป็นเด็กแฝดลำดับที่ 2'),
  ('4', 'เป็นเด็กแฝดลำดับที่ 3'),
  ('5', 'เป็นเด็กแฝดลำดับที่ 4');

COMMIT;
