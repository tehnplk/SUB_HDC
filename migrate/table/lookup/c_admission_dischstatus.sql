-- Source: MOPH 43-file official code sheet
-- "131,136.รหัสสถานภาพการจำหน่ายผู้ป่วย (แฟ้ม ADMISSION).xls"
-- (healthinformationmoph Google Drive). ADMISSION.DISCHSTATUS, code C(1).
-- English names are verbatim from the sheet; Thai names are translations.
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_admission_dischstatus` (
  `code` varchar(1) NOT NULL,
  `dischstatus_name` varchar(255) NOT NULL,
  `dischstatus_name_en` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_admission_dischstatus`;

INSERT INTO `c_admission_dischstatus` (`code`, `dischstatus_name`, `dischstatus_name_en`) VALUES
  ('1', 'หายเป็นปกติ', 'Complete Recovery'),
  ('2', 'ทุเลา/ดีขึ้น', 'Improved'),
  ('3', 'ไม่ดีขึ้น', 'Not Improved'),
  ('4', 'คลอดปกติ', 'Normal Delivery'),
  ('5', 'ยังไม่คลอด', 'Un-Delivery'),
  ('6', 'ทารกปกติ จำหน่ายพร้อมมารดา', 'Normal child discharged with mother'),
  ('7', 'ทารกปกติ จำหน่ายแยกจากมารดา', 'Normal child discharged separately'),
  ('8', 'ทารกตายคลอด', 'Dead stillbirth'),
  ('9', 'เสียชีวิต', 'Dead');

COMMIT;
