-- Source: F43 SERVICE file, TYPEOUT field (สถานะผู้มารับบริการเมื่อเสร็จสิ้นบริการ).
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_service_typeout` (
  `code` varchar(1) NOT NULL,
  `typeout_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_service_typeout`;

INSERT INTO `c_service_typeout` (`code`, `typeout_name`) VALUES
  ('1', 'จำหน่ายกลับบ้าน'),
  ('2', 'รับไว้รักษาต่อในแผนกผู้ป่วยใน'),
  ('3', 'ส่งต่อไปยังหน่วยบริการอื่น'),
  ('4', 'เสียชีวิต'),
  ('5', 'เสียชีวิตก่อนมาถึงหน่วยบริการ'),
  ('6', 'เสียชีวิตระหว่างส่งต่อไปยังหน่วยบริการอื่น'),
  ('7', 'ปฏิเสธการรักษา'),
  ('8', 'หนีกลับ'),
  ('9', 'การให้บริการโดยไม่มีคำวินิจฉัยโรค');

COMMIT;
