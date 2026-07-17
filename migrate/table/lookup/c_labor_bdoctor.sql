-- Source: MOPH 43-file structure doc, LABOR.BDOCTOR
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_labor_bdoctor` (
  `code` varchar(1) NOT NULL,
  `bdoctor_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_labor_bdoctor`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_labor_bdoctor`;

INSERT INTO `c_labor_bdoctor` (`code`, `bdoctor_name`) VALUES
  ('1', 'แพทย์'),
  ('2', 'พยาบาล'),
  ('3', 'จนท.สาธารณสุข (ที่ไม่ใช่แพทย์ พยาบาล)'),
  ('4', 'ผดุงครรภ์โบราณ'),
  ('5', 'คลอดเอง'),
  ('6', 'อื่นๆ');

COMMIT;
