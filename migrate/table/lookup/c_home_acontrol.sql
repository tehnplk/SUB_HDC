-- Source: MOPH 43-file structure doc, HOME.ACONTROL
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_acontrol` (
  `code` varchar(1) NOT NULL,
  `acontrol_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_acontrol`;

INSERT INTO `c_home_acontrol` (`code`, `acontrol_name`) VALUES
  ('0', 'ไม่ควบคุม'),
  ('1', 'ควบคุม'),
  ('9', 'ไม่ทราบ');

COMMIT;
