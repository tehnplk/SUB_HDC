-- Source: MOPH 43-file structure doc, ACCIDENT.TRAFFIC
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_traffic` (
  `code` varchar(1) NOT NULL,
  `traffic_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_traffic`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_traffic`;

INSERT INTO `c_accident_traffic` (`code`, `traffic_name`) VALUES
  ('1', 'ผู้ขับขี่'),
  ('2', 'ผู้โดยสาร'),
  ('3', 'คนเดินเท้า'),
  ('8', 'อื่นๆ'),
  ('9', 'ไม่ทราบ');

COMMIT;
