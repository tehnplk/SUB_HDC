-- Source: MOPH 43-file structure doc, ANC.ANCNO
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_anc_ancno` (
  `code` varchar(1) NOT NULL,
  `ancno_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_anc_ancno`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_anc_ancno`;

INSERT INTO `c_anc_ancno` (`code`, `ancno_name`) VALUES
  ('1', 'การนัดช่วงที่ 1 อายุครรภ์ ≤ 12 สัปดาห์'),
  ('2', 'การนัดช่วงที่ 2 อายุครรภ์ 13 - <20 สัปดาห์'),
  ('3', 'การนัดช่วงที่ 3 อายุครรภ์ 20 - <26 สัปดาห์'),
  ('4', 'การนัดช่วงที่ 4 อายุครรภ์ 26 - <32 สัปดาห์'),
  ('5', 'การนัดช่วงที่ 5 อายุครรภ์ 32 - 40 สัปดาห์');

COMMIT;
