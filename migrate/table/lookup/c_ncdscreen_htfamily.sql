-- Source: MOPH 43-file structure doc, NCDSCREEN.HTFAMILY (parallel to DMFAMILY)
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_ncdscreen_htfamily` (
  `code` varchar(1) NOT NULL,
  `htfamily_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_ncdscreen_htfamily`;

INSERT INTO `c_ncdscreen_htfamily` (`code`, `htfamily_name`) VALUES
  ('1', 'มีประวัติความดันโลหิตสูงในญาติสายตรง'),
  ('2', 'ไม่มี'),
  ('9', 'ไม่ทราบ');

COMMIT;
