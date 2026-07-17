-- Source: MOPH 43-file structure doc, DENTAL.GUM
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_dental_gum` (
  `code` varchar(1) NOT NULL,
  `gum_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_dental_gum`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_dental_gum`;

INSERT INTO `c_dental_gum` (`code`, `gum_name`) VALUES
  ('0', 'ปกติ'),
  ('1', 'เหงือกอักเสบ'),
  ('2', 'มีหินน้ำลายชัดเจน'),
  ('3', 'ปริทันต์อักเสบ หรือมีฟันโยก'),
  ('9', 'ไม่มีฟันหรือตรวจไม่ได้');

COMMIT;
