-- Source: MOPH 43-file structure doc, DENTAL.NPROSTHESIS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_nprosthesis` (
  `code` varchar(1) NOT NULL,
  `nprosthesis_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_dental_nprosthesis`;

INSERT INTO `c_dental_nprosthesis` (`code`, `nprosthesis_name`) VALUES
  ('1', 'ต้องใส่ฟันเทียมบนและล่าง'),
  ('2', 'ต้องใส่ฟันเทียมบน'),
  ('3', 'ต้องใส่ฟันเทียมล่าง'),
  ('4', 'ไม่ต้องใส่ฟันเทียม');

COMMIT;
