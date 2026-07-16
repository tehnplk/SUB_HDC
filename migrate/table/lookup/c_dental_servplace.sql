-- Source: MOPH 43-file structure doc, DENTAL.SERVPLACE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_servplace` (
  `code` varchar(1) NOT NULL,
  `servplace_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_dental_servplace`;

INSERT INTO `c_dental_servplace` (`code`, `servplace_name`) VALUES
  ('1', 'ในหน่วยบริการ'),
  ('2', 'นอกหน่วยบริการ');

COMMIT;
