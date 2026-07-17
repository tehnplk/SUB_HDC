-- Source: MOPH 43-file structure doc, ACCIDENT.AEPLACE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_accident_aeplace` (
  `code` varchar(2) NOT NULL,
  `aeplace_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_accident_aeplace`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_accident_aeplace`;

INSERT INTO `c_accident_aeplace` (`code`, `aeplace_name`) VALUES
  ('01', 'ที่บ้าน หรืออาคารที่พัก'),
  ('02', 'ในสถานที่ทำงาน ยกเว้นโรงงานหรือก่อสร้าง'),
  ('03', 'ในโรงงานอุตสาหกรรม หรือบริเวณก่อสร้าง'),
  ('04', 'ภายในอาคารอื่นๆ'),
  ('05', 'ในสถานที่สาธารณะ'),
  ('06', 'ในชุมชน และไร่นา'),
  ('07', 'บนถนนสายหลัก'),
  ('08', 'บนถนนสายรอง'),
  ('09', 'ในแม่น้ำ ลำคลอง หนองน้ำ'),
  ('10', 'ในทะเล'),
  ('11', 'ในป่า/ภูเขา'),
  ('98', 'อื่นๆ'),
  ('99', 'ไม่ทราบ');

COMMIT;
