-- Source: MOPH 43-file structure doc, DENTAL.DENTTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_denttype` (
  `code` varchar(1) NOT NULL,
  `denttype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_dental_denttype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_dental_denttype`;

INSERT INTO `c_dental_denttype` (`code`, `denttype_name`) VALUES
  ('1', 'กลุ่มหญิงตั้งครรภ์'),
  ('2', 'กลุ่มเด็กก่อนวัยเรียน (อายุ 0-5 ปี)'),
  ('3', 'กลุ่มเด็กวัยเรียน (อายุ 6-12 ปี)'),
  ('4', 'กลุ่มผู้สูงอายุ (อายุ 60 ปีขึ้นไป)'),
  ('5', 'กลุ่มอื่นๆ (นอกเหนือจาก 4 กลุ่มแรก)');

COMMIT;
