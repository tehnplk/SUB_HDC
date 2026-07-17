-- Source: MOPH 43-file structure doc, ADMISSION.CAUSEIN
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_admission_causein` (
  `code` varchar(1) NOT NULL,
  `causein_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_admission_causein`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_admission_causein`;

INSERT INTO `c_admission_causein` (`code`, `causein_name`) VALUES
  ('1', 'เพื่อการวินิจฉัยและรักษา'),
  ('2', 'เพื่อการวินิจฉัย'),
  ('3', 'เพื่อการรักษาต่อเนื่อง'),
  ('4', 'เพื่อการดูแลต่อใกล้บ้าน'),
  ('5', 'ตามความต้องการผู้ป่วย');

COMMIT;
