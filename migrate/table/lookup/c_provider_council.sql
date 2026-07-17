-- Source: MOPH 43-file official code sheet (healthinformationmoph Google Drive), PROVIDER.COUNCIL
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_provider_council` (
  `code` varchar(2) NOT NULL,
  `council_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

ALTER TABLE `c_provider_council`
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1;

START TRANSACTION;

DELETE FROM `c_provider_council`;

INSERT INTO `c_provider_council` (`code`, `council_name`) VALUES
  ('01', 'แพทยสภา'),
  ('02', 'สภาการพยาบาล'),
  ('03', 'สภาเภสัชกรรม'),
  ('04', 'ทันตแพทยสภา'),
  ('05', 'สภากายภาพบำบัด'),
  ('06', 'สภาเทคนิคการแพทย์'),
  ('07', 'สัตวแพทยสภา');

COMMIT;
