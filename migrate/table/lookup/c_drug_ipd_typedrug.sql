-- Source: MOPH 43-file structure doc, DRUG_IPD.TYPEDRUG
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_drug_ipd_typedrug` (
  `code` varchar(1) NOT NULL,
  `typedrug_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_drug_ipd_typedrug`;

INSERT INTO `c_drug_ipd_typedrug` (`code`, `typedrug_name`) VALUES
  ('1', 'ยาที่จ่ายให้ผู้ป่วยระหว่างรักษาในโรงพยาบาล'),
  ('2', 'ยาที่จ่ายให้ผู้ป่วยเมื่อจำหน่ายผู้ป่วย เพื่อกลับไปใช้ที่บ้าน');

COMMIT;
