-- Source: MOPH 43-file structure doc, FP.FPTYPE / WOMEN.FPTYPE (รหัสวิธีการคุมกำเนิด)
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_fp_fptype` (
  `code` varchar(1) NOT NULL,
  `fptype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_fp_fptype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_fp_fptype`;

INSERT INTO `c_fp_fptype` (`code`, `fptype_name`) VALUES
  ('1', 'ยาเม็ด'),
  ('2', 'ยาฉีด'),
  ('3', 'ห่วงอนามัย'),
  ('4', 'ยาฝัง'),
  ('5', 'ถุงยางอนามัย'),
  ('6', 'หมันชาย'),
  ('7', 'หมันหญิง');

COMMIT;
