-- Source: MOPH 43-file structure doc, NEWBORNCARE.FOOD
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborncare_food` (
  `code` varchar(1) NOT NULL,
  `food_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_newborncare_food`;

INSERT INTO `c_newborncare_food` (`code`, `food_name`) VALUES
  ('1', 'นมแม่อย่างเดียว'),
  ('2', 'นมแม่และน้ำ'),
  ('3', 'นมแม่และนมผสม'),
  ('4', 'นมผสมอย่างเดียว');

COMMIT;
