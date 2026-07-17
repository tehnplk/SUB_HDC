-- Source: MOPH 43-file structure doc, CHRONICFU.FOOT
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_chronicfu_foot` (
  `code` varchar(1) NOT NULL,
  `foot_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_chronicfu_foot`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_chronicfu_foot`;

INSERT INTO `c_chronicfu_foot` (`code`, `foot_name`) VALUES
  ('1', 'ตรวจ ผลปกติ'),
  ('2', 'ไม่ตรวจ'),
  ('3', 'ตรวจ ผลไม่ปกติ'),
  ('9', 'ไม่ทราบ');

COMMIT;
