-- Source: MOPH 43-file structure doc, DENTAL.NEED_SCALING
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_need_scaling` (
  `code` varchar(1) NOT NULL,
  `need_scaling_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_dental_need_scaling`;

INSERT INTO `c_dental_need_scaling` (`code`, `need_scaling_name`) VALUES
  ('1', 'ต้องขูดหินน้ำลาย'),
  ('2', 'ไม่ต้องขูดหินน้ำลาย');

COMMIT;
