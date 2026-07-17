-- Source: MOPH 43-file structure doc, DEATH.PREGDEATH (เฉพาะหญิงตั้งครรภ์)
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_death_pregdeath` (
  `code` varchar(1) NOT NULL,
  `pregdeath_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_death_pregdeath`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_death_pregdeath`;

INSERT INTO `c_death_pregdeath` (`code`, `pregdeath_name`) VALUES
  ('1', 'เสียชีวิตระหว่างตั้งครรภ์'),
  ('2', 'เสียชีวิตระหว่างคลอดหรือหลังคลอดภายใน 42 วัน');

COMMIT;
