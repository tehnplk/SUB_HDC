-- Source: MOPH 43-file structure doc, DRUGALLERGY.ALEVEL
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_drugallergy_alevel` (
  `code` varchar(1) NOT NULL,
  `alevel_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_drugallergy_alevel`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_drugallergy_alevel`;

INSERT INTO `c_drugallergy_alevel` (`code`, `alevel_name`) VALUES
  ('1', 'ไม่ร้ายแรง (Non-serious)'),
  ('2', 'ร้ายแรง - เสียชีวิต (Death)'),
  ('3', 'ร้ายแรง - อันตรายถึงชีวิต (Life-threatening)'),
  ('4', 'ร้ายแรง - ต้องเข้ารับการรักษาในโรงพยาบาล (Hospitalization-initial)'),
  ('5', 'ร้ายแรง - ทำให้เพิ่มระยะเวลาในการรักษานานขึ้น (Hospitalization-prolonged)'),
  ('6', 'ร้ายแรง - พิการ (Disability)'),
  ('7', 'ร้ายแรง - เป็นเหตุให้เกิดความผิดปกติแต่กำเนิด (Congenital anomaly)'),
  ('8', 'ร้ายแรง - อื่นๆ (Other serious)');

COMMIT;
