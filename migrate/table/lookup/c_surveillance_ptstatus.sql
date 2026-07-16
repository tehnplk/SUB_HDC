-- Source: MOPH 43-file structure doc, SURVEILLANCE.PTSTATUS
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_surveillance_ptstatus` (
  `code` varchar(1) NOT NULL,
  `ptstatus_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_surveillance_ptstatus`;

INSERT INTO `c_surveillance_ptstatus` (`code`, `ptstatus_name`) VALUES
  ('1', 'หาย'),
  ('2', 'ตาย'),
  ('3', 'ยังรักษาอยู่'),
  ('9', 'ไม่ทราบ');

COMMIT;
