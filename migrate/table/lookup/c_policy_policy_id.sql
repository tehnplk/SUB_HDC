-- Source: MOPH 43-file official code sheet (healthinformationmoph Google Drive), POLICY.POLICY_ID
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_policy_policy_id` (
  `code` varchar(3) NOT NULL,
  `policy_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_policy_policy_id`;

INSERT INTO `c_policy_policy_id` (`code`, `policy_name`) VALUES
  ('001', 'วัดเส้นรอบศรีษะเด็กแรกเกิด');

COMMIT;
