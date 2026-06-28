CREATE TABLE `report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `sql` longtext NOT NULL,
  `date_update` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for report
INSERT INTO `report` (`id`, `name`, `sql`, `date_update`) VALUES (1, 'จำนวนประชากรแยกตามหน่วยบริการ', 'SELECT hospcode, COUNT(*) AS total_person FROM person GROUP BY hospcode ORDER BY hospcode', '2026-06-27 21:08:15');
INSERT INTO `report` (`id`, `name`, `sql`, `date_update`) VALUES (2, 'จำนวนบริการแยกตามหน่วยบริการ', 'SELECT hospcode, COUNT(*) AS total_service FROM service GROUP BY hospcode ORDER BY hospcode', '2026-06-27 21:08:20');
INSERT INTO `report` (`id`, `name`, `sql`, `date_update`) VALUES (3, 'รหัสวินิจฉัยที่พบบ่อย 50 อันดับ', 'SELECT diagcode, COUNT(*) AS total_visit FROM diagnosis_opd WHERE diagcode IS NOT NULL AND diagcode <> '''' GROUP BY diagcode ORDER BY total_visit DESC LIMIT 10', '2026-06-27 21:08:36');
