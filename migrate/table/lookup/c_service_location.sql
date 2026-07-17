-- Source: MOPH 43-file structure doc, SERVICE.LOCATION
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_service_location` (
  `code` varchar(1) NOT NULL,
  `location_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_service_location`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_service_location`;

INSERT INTO `c_service_location` (`code`, `location_name`) VALUES
  ('1', 'ในเขตรับผิดชอบ'),
  ('2', 'นอกเขตรับผิดชอบ');

COMMIT;
