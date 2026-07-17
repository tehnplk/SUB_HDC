-- Source: https://docs.google.com/spreadsheets/d/1Oq53sTcAOLzkORQZkq-CC6dseklnwDCu/edit?gid=1104972917
-- File: 33.รหัสประเภทการจำหน่าย (แฟ้ม CHRONIC).xls
-- Sheet: รหัสประเภทการจำหน่าย
-- Renamed from c_chronic_discharge to match the c_{table}_{field} lookup convention
SET NAMES utf8mb3;

DROP TABLE IF EXISTS `c_chronic_discharge`;

CREATE TABLE IF NOT EXISTS `c_chronic_typedisch` (
  `code` varchar(2) NOT NULL,
  `chronic_discharge_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_chronic_typedisch`;

INSERT INTO `c_chronic_typedisch` (`code`, `chronic_discharge_name`) VALUES
  ('01', 'หาย'),
  ('02', 'ตาย'),
  ('03', 'ยังรักษาอยู่'),
  ('04', 'ไม่ทราบ(ไม่มีข้อมูล)'),
  ('05', 'รอจำหน่าย/เฝ้าระวัง'),
  ('06', 'ขาดการรักษาไม่มาติดต่ออีก(ทราบว่าขาดการรักษา)'),
  ('07', 'ครบการรักษา'),
  ('08', 'โรคอยู่ในภาวะสงบ(inactive)ไม่มีความจำเป็นต้องรักษา'),
  ('09', 'ปฎิเสธการรักษา'),
  ('10', 'ออกจากพื้นที่'),
  ('11', 'กลับเป็นซ้ำ');

COMMIT;
