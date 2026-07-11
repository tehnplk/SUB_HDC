-- ตารางเก็บผล s_persontype จาก HDC opendata API (job sync: hdc_api_s_persontype)
-- 1 แถว = 1 hospcode ต่อปีงบประมาณ — job ลบ/ใส่ใหม่ทั้งปีทุกรอบดึง
CREATE TABLE IF NOT EXISTS `hdc_api_s_persontype` (
  `b_year` varchar(4) NOT NULL,
  `hospcode` varchar(5) NOT NULL,
  `areacode` varchar(8) DEFAULT NULL,
  `type1` int NOT NULL DEFAULT 0,
  `type2` int NOT NULL DEFAULT 0,
  `type3` int NOT NULL DEFAULT 0,
  `type4` int NOT NULL DEFAULT 0,
  `type5` int NOT NULL DEFAULT 0,
  `type1c` int NOT NULL DEFAULT 0,
  `type2c` int NOT NULL DEFAULT 0,
  `type3c` int NOT NULL DEFAULT 0,
  `type4c` int NOT NULL DEFAULT 0,
  `type5c` int NOT NULL DEFAULT 0,
  `date_com` varchar(12) DEFAULT NULL,
  `d_update` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`b_year`, `hospcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
