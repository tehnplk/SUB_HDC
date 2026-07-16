-- Source: MOPH 43-file structure doc, CHRONICFU.RETINA
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_chronicfu_retina` (
  `code` varchar(1) NOT NULL,
  `retina_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_chronicfu_retina`;

INSERT INTO `c_chronicfu_retina` (`code`, `retina_name`) VALUES
  ('1', 'ตรวจ opthalmoscope ผลปกติ'),
  ('2', 'ตรวจด้วย fundus camera ผลปกติ'),
  ('3', 'ตรวจ opthalmoscope ผลไม่ปกติ'),
  ('4', 'ตรวจด้วย fundus camera ผลไม่ปกติ'),
  ('8', 'ไม่ตรวจ'),
  ('9', 'ไม่ทราบ');

COMMIT;
