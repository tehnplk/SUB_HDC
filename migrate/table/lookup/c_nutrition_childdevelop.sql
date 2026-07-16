-- Source: MOPH 43-file structure doc, NUTRITION.CHILDDEVELOP
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_nutrition_childdevelop` (
  `code` varchar(1) NOT NULL,
  `childdevelop_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_nutrition_childdevelop`;

INSERT INTO `c_nutrition_childdevelop` (`code`, `childdevelop_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'สงสัยช้ากว่าปกติ'),
  ('3', 'ช้ากว่าปกติ');

COMMIT;
