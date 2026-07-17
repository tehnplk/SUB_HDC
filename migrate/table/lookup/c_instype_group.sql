SET NAMES utf8mb3;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `c_instype_group`;
CREATE TABLE `c_instype_group` (
  `id` tinyint UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO `c_instype_group` (`id`, `name`) VALUES
(1, 'ข้าราชการ รัฐวิสาหกิจ'),
(2, 'ประกันสังคม'),
(3, 'UC ทั้งหมด'),
(4, 'ต่างด้าว');

SET FOREIGN_KEY_CHECKS=1;
