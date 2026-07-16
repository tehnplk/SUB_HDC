-- Source: MOPH 43-file official code sheet (healthinformationmoph Google Drive), DISABILITY.DISABTYPE
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_disability_disabtype` (
  `code` varchar(1) NOT NULL,
  `disabtype_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_disability_disabtype`;

INSERT INTO `c_disability_disabtype` (`code`, `disabtype_name`) VALUES
  ('1', 'ความพิการทางการเห็น'),
  ('2', 'ความพิการทางการได้ยินหรือการสื่อความหมาย'),
  ('3', 'ความพิการการเคลื่อนไหวหรือทางร่างกาย'),
  ('4', 'ความพิการทางจิตใจหรือพฤติกรรมหรือออทิสติก'),
  ('5', 'ความพิการทางสติปัญญา'),
  ('6', 'ความพิการทางการเรียนรู้'),
  ('7', 'ความพิการทางออทิสติก');

COMMIT;
