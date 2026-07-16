-- Source: MOPH 43-file structure doc, ACCIDENT.VEHICLE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_vehicle` (
  `code` varchar(2) NOT NULL,
  `vehicle_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_accident_vehicle`;

INSERT INTO `c_accident_vehicle` (`code`, `vehicle_name`) VALUES
  ('01', 'จักรยานและสามล้อถีบ'),
  ('02', 'จักรยานยนต์'),
  ('03', 'สามล้อเครื่อง'),
  ('04', 'รถยนต์นั่ง/แท็กซี่'),
  ('05', 'รถปิกอัพ'),
  ('06', 'รถตู้'),
  ('07', 'รถโดยสารสองแถว'),
  ('08', 'รถโดยสารใหญ่ (รถบัส รถเมล์)'),
  ('09', 'รถบรรทุก/รถพ่วง'),
  ('10', 'เรือโดยสาร'),
  ('11', 'เรืออื่นๆ'),
  ('12', 'อากาศยาน'),
  ('98', 'อื่นๆ'),
  ('99', 'ไม่ทราบ');

COMMIT;
