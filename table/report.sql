CREATE TABLE `report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `sql` longtext NOT NULL,
  `date_update` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `report` (`name`, `sql`)
SELECT
  'จำนวนประชากรแยกตามหน่วยบริการ',
  'SELECT hospcode, COUNT(*) AS total_person FROM person GROUP BY hospcode ORDER BY hospcode'
WHERE NOT EXISTS (
  SELECT 1 FROM `report` WHERE `name` = 'จำนวนประชากรแยกตามหน่วยบริการ'
);

INSERT INTO `report` (`name`, `sql`)
SELECT
  'จำนวนบริการแยกตามหน่วยบริการ',
  'SELECT hospcode, COUNT(*) AS total_service FROM service GROUP BY hospcode ORDER BY hospcode'
WHERE NOT EXISTS (
  SELECT 1 FROM `report` WHERE `name` = 'จำนวนบริการแยกตามหน่วยบริการ'
);

INSERT INTO `report` (`name`, `sql`)
SELECT
  'รหัสวินิจฉัยที่พบบ่อย 50 อันดับ',
  'SELECT diagcode, COUNT(*) AS total_visit FROM diagnosis_opd WHERE diagcode IS NOT NULL AND diagcode <> '''' GROUP BY diagcode ORDER BY total_visit DESC LIMIT 50'
WHERE NOT EXISTS (
  SELECT 1 FROM `report` WHERE `name` = 'รหัสวินิจฉัยที่พบบ่อย 50 อันดับ'
);
