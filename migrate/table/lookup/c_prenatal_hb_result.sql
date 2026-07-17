-- Source: MOPH 43-file structure doc, PRENATAL.HB_RESULT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_prenatal_hb_result` (
  `code` varchar(1) NOT NULL,
  `hb_result_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_prenatal_hb_result`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_prenatal_hb_result`;

INSERT INTO `c_prenatal_hb_result` (`code`, `hb_result_name`) VALUES
  ('1', 'ปกติ'),
  ('2', 'ผิดปกติ'),
  ('3', 'ไม่ตรวจ'),
  ('4', 'รอผลตรวจ'),
  ('9', 'ไม่ทราบ');

COMMIT;
