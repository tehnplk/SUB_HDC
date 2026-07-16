-- Source: MOPH 43-file structure doc, POSTNATAL.PPRESULT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_postnatal_ppresult` (
  `code` varchar(1) NOT NULL,
  `ppresult_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_postnatal_ppresult`;

INSERT INTO `c_postnatal_ppresult` (`code`, `ppresult_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'ผิดปกติ'),
  ('9', 'ไม่ทราบ');

COMMIT;
