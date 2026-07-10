-- MySQL-compatible export generated from Docker PostgreSQL database sub_hdc_center
-- Tables: one table per file
SET NAMES utf8mb3;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `c_hostype`;
CREATE TABLE `c_hostype` (
  `code` VARCHAR(255) NOT NULL,
  `hostype_name` VARCHAR(255) NULL,
  `dep_name` VARCHAR(255) NULL,
  `hostype` VARCHAR(255) NULL,
  `hostype_list` VARCHAR(255) NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
INSERT INTO `c_hostype` (`code`, `hostype_name`, `dep_name`, `hostype`, `hostype_list`) VALUES
('11', 'กระทรวงสาธารณสุข', 'กรมสุขภาพจิต', 'รพ.จิตเวช', 'รายโรงพยาบาล'),
('12', 'สังกัดอื่น', NULL, 'รพ.นอกสังกัด', 'รายโรงพยาบาล'),
('13', 'สังกัดอื่น', 'กระทรวงยุติธรรม', 'สถานพยาบาล', 'รายหน่วยบริการ'),
('18', 'กระทรวงสาธารณสุข', 'สำนักปลัดกระทรวงสาธารณสุข', 'รพ.สต.', 'รายหน่วยบริการ'),
('21', 'องค์กรปกครองส่วนท้องถิ่น', 'องค์กรปกครองส่วนท้องถิ่น', 'รพ.สต.', 'รายหน่วยบริการ'),
('5', 'กระทรวงสาธารณสุข', 'สำนักปลัดกระทรวงสาธารณสุข', 'รพศ.', 'รายโรงพยาบาล'),
('7', 'กระทรวงสาธารณสุข', 'สำนักปลัดกระทรวงสาธารณสุข', 'รพ.', 'รายโรงพยาบาล'),
('8', 'กระทรวงสาธารณสุข', 'สำนักปลัดกระทรวงสาธารณสุข', 'ศูนย์สุขภาพ', 'รายหน่วยบริการ');

SET FOREIGN_KEY_CHECKS=1;
