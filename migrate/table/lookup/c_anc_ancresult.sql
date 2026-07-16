-- Source: MOPH 43-file structure doc, ANC.ANCRESULT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_anc_ancresult` (
  `code` varchar(1) NOT NULL,
  `ancresult_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_anc_ancresult`;

INSERT INTO `c_anc_ancresult` (`code`, `ancresult_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'ผิดปกติ'),
  ('9', 'ไม่ทราบ');

COMMIT;
