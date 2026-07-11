-- นับประชากรแฟ้ม person แยกตาม typearea (1-5) รายหน่วยบริการ
-- เฉพาะ discharge = 9 (ยังไม่จำหน่าย) — full replace: hospcode ที่หายจาก
-- แฟ้ม person (เช่นถูกลบทิ้ง) ต้องหายจากตารางสรุปด้วย upsert เดิมทิ้งแถวค้าง
CREATE TABLE IF NOT EXISTS `s_person_type_count` (
  `hospcode` varchar(10) NOT NULL,
  `type_1` int NOT NULL DEFAULT 0,
  `type_2` int NOT NULL DEFAULT 0,
  `type_3` int NOT NULL DEFAULT 0,
  `type_4` int NOT NULL DEFAULT 0,
  `type_5` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`hospcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

DELETE FROM `s_person_type_count`;

INSERT INTO `s_person_type_count`
  (`hospcode`, `type_1`, `type_2`, `type_3`, `type_4`, `type_5`)
SELECT
  `hospcode`,
  SUM(`typearea` = '1') AS `type_1`,
  SUM(`typearea` = '2') AS `type_2`,
  SUM(`typearea` = '3') AS `type_3`,
  SUM(`typearea` = '4') AS `type_4`,
  SUM(`typearea` = '5') AS `type_5`
FROM `person`
WHERE `discharge` = '9'
GROUP BY `hospcode`;

COMMIT;
