-- Source: MOPH 43-file structure doc, DENTAL.SCHOOLTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_schooltype` (
  `code` varchar(1) NOT NULL,
  `schooltype_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_dental_schooltype`;

INSERT INTO `c_dental_schooltype` (`code`, `schooltype_name`) VALUES
  ('1', 'ศูนย์พัฒนาเด็กเล็กหรือระดับอนุบาล'),
  ('2', 'ประถมศึกษารัฐบาล'),
  ('3', 'ประถมศึกษาเทศบาล'),
  ('4', 'ประถมศึกษาท้องถิ่น'),
  ('5', 'ประถมศึกษาเอกชน'),
  ('6', 'มัธยมศึกษารัฐบาล'),
  ('7', 'มัธยมศึกษาเทศบาล'),
  ('8', 'มัธยมศึกษาท้องถิ่น'),
  ('9', 'มัธยมศึกษาเอกชน');

COMMIT;
