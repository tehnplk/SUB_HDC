-- Source: MOPH 43-file structure doc, DRUGALLERGY.INFORMANT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_drugallergy_informant` (
  `code` varchar(1) NOT NULL,
  `informant_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_drugallergy_informant`;

INSERT INTO `c_drugallergy_informant` (`code`, `informant_name`) VALUES
  ('1', 'ผู้ป่วยให้ประวัติเอง'),
  ('2', 'ผู้ป่วยให้ประวัติจากการให้ข้อมูลของหน่วยบริการอื่น'),
  ('3', 'หน่วยบริการอื่นเป็นผู้ให้ข้อมูล'),
  ('4', 'หน่วยบริการแห่งนี้เป็นผู้พบการแพ้ยาเอง');

COMMIT;
