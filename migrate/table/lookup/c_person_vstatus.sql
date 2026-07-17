-- Source: MOPH 43-file structure doc, PERSON.VSTATUS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_vstatus` (
  `code` varchar(1) NOT NULL,
  `vstatus_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_person_vstatus`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_person_vstatus`;

INSERT INTO `c_person_vstatus` (`code`, `vstatus_name`) VALUES
  ('1', 'กำนัน ผู้ใหญ่บ้าน'),
  ('2', 'อสม.'),
  ('3', 'แพทย์ประจำตำบล'),
  ('4', 'สมาชิกอบต.'),
  ('5', 'อื่นๆ');

COMMIT;
