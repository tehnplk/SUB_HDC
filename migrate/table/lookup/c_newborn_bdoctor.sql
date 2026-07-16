-- Source: MOPH 43-file structure doc, NEWBORN.BDOCTOR
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborn_bdoctor` (
  `code` varchar(1) NOT NULL,
  `bdoctor_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_newborn_bdoctor`;

INSERT INTO `c_newborn_bdoctor` (`code`, `bdoctor_name`) VALUES
  ('1', 'แพทย์'),
  ('2', 'พยาบาล'),
  ('3', 'จนท.สาธารณสุข (ที่ไม่ใช่แพทย์ พยาบาล)'),
  ('4', 'ผดุงครรภ์โบราณ'),
  ('5', 'คลอดเอง'),
  ('6', 'อื่นๆ');

COMMIT;
