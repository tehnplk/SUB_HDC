-- Source: MOPH 43-file structure doc, NUTRITION.BOTTLE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_nutrition_bottle` (
  `code` varchar(1) NOT NULL,
  `bottle_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_nutrition_bottle`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_nutrition_bottle`;

INSERT INTO `c_nutrition_bottle` (`code`, `bottle_name`) VALUES
  ('1', 'ใช้ขวดนม'),
  ('2', 'ไม่ใช้ขวดนม');

COMMIT;
