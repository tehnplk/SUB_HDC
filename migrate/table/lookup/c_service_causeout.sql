-- Source: MOPH 43-file structure doc, SERVICE.CAUSEOUT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_service_causeout` (
  `code` varchar(1) NOT NULL,
  `causeout_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_service_causeout`;

INSERT INTO `c_service_causeout` (`code`, `causeout_name`) VALUES
  ('1', 'เพื่อการวินิจฉัยและรักษา'),
  ('2', 'เพื่อการวินิจฉัย'),
  ('3', 'เพื่อการรักษาและฟื้นฟูต่อเนื่อง'),
  ('4', 'เพื่อการดูแลต่อใกล้บ้าน'),
  ('5', 'ตามความต้องการผู้ป่วย');

COMMIT;
