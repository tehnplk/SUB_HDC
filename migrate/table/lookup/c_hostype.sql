-- MySQL-compatible lookup seed for c_hostype.
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_hostype` (
  `code` varchar(255) NOT NULL,
  `hostype_name` varchar(255) NULL,
  `dep_name` varchar(255) NULL,
  `dep_short` varchar(255) NULL,
  `hostype` varchar(255) NULL,
  `hostype_list` varchar(255) NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_hostype`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

ALTER TABLE `c_hostype`
  ADD COLUMN IF NOT EXISTS `dep_short` varchar(255) DEFAULT NULL AFTER `dep_name`;

START TRANSACTION;

DELETE FROM `c_hostype`;

INSERT INTO `c_hostype` (`code`, `hostype_name`, `dep_name`, `dep_short`, `hostype`, `hostype_list`) VALUES
('11', 'กระทรวงสาธารณสุข', 'กรมสุขภาพจิต', 'กรมสุขภาพจิต', 'รพ.จิตเวช', 'รายโรงพยาบาล'),
('12', 'สังกัดอื่น', NULL, 'รพ.นอกสังกัด', 'รพ.นอกสังกัด', 'รายโรงพยาบาล'),
('13', 'สังกัดอื่น', 'กระทรวงยุติธรรม', 'สถานพยาบาล', 'สถานพยาบาล', 'รายหน่วยบริการ'),
('18', 'กระทรวงสาธารณสุข', 'สำนักงานปลัดกระทรวงสาธารณสุข', 'สธ', 'รพ.สต.', 'รายหน่วยบริการ'),
('21', 'องค์กรปกครองส่วนท้องถิ่น', 'องค์กรปกครองส่วนท้องถิ่น', 'อปท', 'รพ.สต.', 'รายหน่วยบริการ'),
('5', 'กระทรวงสาธารณสุข', 'สำนักงานปลัดกระทรวงสาธารณสุข', 'สธ', 'รพศ.', 'รายโรงพยาบาล'),
('7', 'กระทรวงสาธารณสุข', 'สำนักงานปลัดกระทรวงสาธารณสุข', 'สธ', 'รพ.', 'รายโรงพยาบาล'),
('8', 'กระทรวงสาธารณสุข', 'สำนักงานปลัดกระทรวงสาธารณสุข', 'สธ', 'ศูนย์สุขภาพ', 'รายหน่วยบริการ');

COMMIT;
