-- Source: MOPH 43-file structure doc, DIAGNOSIS_IPD.DIAGTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_diagnosis_ipd_diagtype` (
  `code` varchar(1) NOT NULL,
  `diagtype_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_diagnosis_ipd_diagtype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_diagnosis_ipd_diagtype`;

INSERT INTO `c_diagnosis_ipd_diagtype` (`code`, `diagtype_name`) VALUES
  ('1', 'PRINCIPLE DX (การวินิจฉัยโรคหลัก)'),
  ('2', 'CO-MORBIDITY (การวินิจฉัยโรคร่วม)'),
  ('3', 'COMPLICATION (การวินิจฉัยโรคแทรก)'),
  ('4', 'OTHER (อื่นๆ)'),
  ('5', 'EXTERNAL CAUSE (สาเหตุภายนอก)'),
  ('6', 'Additional Code (รหัสเสริม)'),
  ('7', 'Morphology Code (รหัสเกี่ยวกับเนื้องอก)');

COMMIT;
