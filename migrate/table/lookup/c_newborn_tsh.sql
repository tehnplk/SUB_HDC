-- Source: MOPH 43-file structure doc, NEWBORN.TSH
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborn_tsh` (
  `code` varchar(1) NOT NULL,
  `tsh_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_newborn_tsh`;

INSERT INTO `c_newborn_tsh` (`code`, `tsh_name`) VALUES
  ('1', 'ได้รับการตรวจ'),
  ('2', 'ไม่ได้ตรวจ'),
  ('9', 'ไม่ทราบ');

COMMIT;
