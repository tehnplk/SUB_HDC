-- Source: MOPH 43-file structure doc, SERVICE.INTIME
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_service_intime` (
  `code` varchar(1) NOT NULL,
  `intime_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_service_intime`;

INSERT INTO `c_service_intime` (`code`, `intime_name`) VALUES
  ('1', 'ในเวลาราชการ'),
  ('2', 'นอกเวลาราชการ');

COMMIT;
