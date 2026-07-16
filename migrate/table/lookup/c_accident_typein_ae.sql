-- Source: MOPH 43-file structure doc, ACCIDENT.TYPEIN_AE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_typein_ae` (
  `code` varchar(1) NOT NULL,
  `typein_ae_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_accident_typein_ae`;

INSERT INTO `c_accident_typein_ae` (`code`, `typein_ae_name`) VALUES
  ('1', 'มารับบริการเอง'),
  ('2', 'ได้รับการส่งตัวโดย First responder'),
  ('3', 'ได้รับการส่งตัวโดย BLS'),
  ('4', 'ได้รับการส่งตัวโดย ILS'),
  ('5', 'ได้รับการส่งตัวโดย ALS'),
  ('6', 'ได้รับการส่งต่อจากหน่วยบริการอื่น'),
  ('7', 'อื่นๆ'),
  ('9', 'ไม่ทราบ');

COMMIT;
