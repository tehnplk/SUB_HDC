-- Source: MOPH 43-file structure doc, DENTAL.NEED_FLUORIDE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_need_fluoride` (
  `code` varchar(1) NOT NULL,
  `need_fluoride_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_dental_need_fluoride`;

INSERT INTO `c_dental_need_fluoride` (`code`, `need_fluoride_name`) VALUES
  ('1', 'ต้องทา/เคลือบฟลูออไรด์'),
  ('2', 'ไม่ต้องทา/เคลือบฟลูออไรด์');

COMMIT;
