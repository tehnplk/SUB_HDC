-- Source: MOPH 43-file structure doc, NUTRITION.FOOD
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_nutrition_food` (
  `code` varchar(1) NOT NULL,
  `food_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_nutrition_food`;

INSERT INTO `c_nutrition_food` (`code`, `food_name`) VALUES
  ('0', 'เลิกดื่มนมแล้ว (เฉพาะอายุเด็ก 0-2 ปี 11 เดือน 29 วัน)'),
  ('1', 'นมแม่อย่างเดียว'),
  ('2', 'นมแม่และน้ำ'),
  ('3', 'นมแม่และนมผสม'),
  ('4', 'นมผสมอย่างเดียว'),
  ('5', 'นมและอาหารอื่นๆ');

COMMIT;
