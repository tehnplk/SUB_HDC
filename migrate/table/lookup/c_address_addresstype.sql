-- Source: MOPH 43-file structure doc, ADDRESS.ADDRESSTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_address_addresstype` (
  `code` varchar(1) NOT NULL,
  `addresstype_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_address_addresstype`;

INSERT INTO `c_address_addresstype` (`code`, `addresstype_name`) VALUES
  ('1', 'ที่อยู่ตามทะเบียนบ้าน'),
  ('2', 'ที่อยู่ที่ติดต่อได้');

COMMIT;
