-- Source: MOPH 43-file structure doc, HOME.CHEMICAL
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_chemical` (
  `code` varchar(1) NOT NULL,
  `chemical_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_home_chemical`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_home_chemical`;

INSERT INTO `c_home_chemical` (`code`, `chemical_name`) VALUES
  ('0', 'ไม่มีการจัดเก็บ'),
  ('1', 'เก็บในตู้มิดชิด'),
  ('2', 'เก็บใส่ในภาชนะอื่นๆ'),
  ('9', 'ไม่ทราบ');

COMMIT;
