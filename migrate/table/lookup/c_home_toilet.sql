-- Source: MOPH 43-file structure doc, HOME.TOILET
SET NAMES utf8mb3;

CREATE TABLE IF NOT EXISTS `c_home_toilet` (
  `code` varchar(1) NOT NULL,
  `toilet_name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

START TRANSACTION;

DELETE FROM `c_home_toilet`;

INSERT INTO `c_home_toilet` (`code`, `toilet_name`) VALUES
  ('0', 'ไม่มี'),
  ('1', 'มี ส้วมนั่งราบ บำบัดด้วยบ่อเกรอะ'),
  ('2', 'มี ส้วมนั่งยอง บำบัดด้วยบ่อเกรอะ'),
  ('3', 'มี ส้วมนั่งราบ บำบัดด้วยถังสำเร็จรูป'),
  ('4', 'มี ส้วมนั่งยอง บำบัดด้วยถังสำเร็จรูป'),
  ('5', 'มีมากกว่า 1 ประเภท'),
  ('9', 'ไม่ทราบ');

COMMIT;
