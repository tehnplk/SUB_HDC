-- Source: MOPH 43-file structure doc, NEWBORNCARE.BCARERESULT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_newborncare_bcareresult` (
  `code` varchar(1) NOT NULL,
  `bcareresult_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_newborncare_bcareresult`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_newborncare_bcareresult`;

INSERT INTO `c_newborncare_bcareresult` (`code`, `bcareresult_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'ผิดปกติ'),
  ('9', 'ไม่ทราบ');

COMMIT;
