-- Source: MOPH 43-file structure doc, ADMISSION.TYPEIN
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_admission_typein` (
  `code` varchar(1) NOT NULL,
  `typein_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_admission_typein`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_admission_typein`;

INSERT INTO `c_admission_typein` (`code`, `typein_name`) VALUES
  ('1', 'มารับบริการเอง'),
  ('2', 'มารับบริการตามนัดหมาย'),
  ('3', 'ได้รับการส่งต่อจากหน่วยบริการอื่น'),
  ('4', 'ได้รับการส่งตัวจากบริการ EMS');

COMMIT;
