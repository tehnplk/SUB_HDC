-- Source: MOPH 43-file structure doc, PRENATAL.THALASSEMIA
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_prenatal_thalassemia` (
  `code` varchar(1) NOT NULL,
  `thalassemia_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_prenatal_thalassemia`;

INSERT INTO `c_prenatal_thalassemia` (`code`, `thalassemia_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'ผิดปกติ'),
  ('3', 'ไม่ตรวจ'),
  ('4', 'รอผลตรวจ'),
  ('9', 'ไม่ทราบ');

COMMIT;
