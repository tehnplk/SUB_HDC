-- Source: MOPH 43-file structure standard, PERSON.TYPEAREA (รหัสสถานะบุคคล).
-- Values verbatim from the 43-file structure document (field 30, code C(1) NOT NULL).
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_person_typearea` (
  `code` varchar(1) NOT NULL,
  `typearea_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_person_typearea`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_person_typearea`;

INSERT INTO `c_person_typearea` (`code`, `typearea_name`) VALUES
  ('1', 'มีชื่ออยู่ตามทะเบียนบ้านในเขตรับผิดชอบและอยู่จริง'),
  ('2', 'มีชื่ออยู่ตามทะเบียนบ้านในเขตรับผิดชอบแต่ตัวไม่อยู่จริง'),
  ('3', 'มาอาศัยอยู่ในเขตรับผิดชอบ(ตามทะเบียนบ้านในเขตรับผิดชอบ)แต่ทะเบียนบ้านอยู่นอกเขตรับผิดชอบ'),
  ('4', 'ที่อาศัยอยู่นอกเขตรับผิดชอบและทะเบียนบ้านไม่อยู่ในเขตรับผิดชอบ เข้ามารับบริการหรือเคยอยู่ในเขตรับผิดชอบ'),
  ('5', 'มาอาศัยในเขตรับผิดชอบแต่ไม่ได้อยู่ตามทะเบียนบ้านในเขตรับผิดชอบ เช่น คนเร่ร่อน ไม่มีที่พักอาศัย เป็นต้น');

COMMIT;
