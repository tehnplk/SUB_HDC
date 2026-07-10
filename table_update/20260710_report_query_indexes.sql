-- Secondary indexes เร่ง query รายงาน (เช่น DM/HbA1c) ที่กวาด labfu/diagnosis/person
-- ทั้งตาราง — ไซต์ใหญ่ (labfu 3.3M, diagnosis_opd 2.4M แถว) query เกิน 10 นาที
-- จนโดน timeout ชั้นบน (proxy/DbQuery tool) ตัด ทั้งที่ my.cnf ไม่ได้ตัดเอง
--
-- แนวคิด: composite เรียง (คอลัมน์ filter, คอลัมน์ช่วงเวลา, cid) ให้เป็น covering
-- index — เงื่อนไข diagcode ในรายงานบางตัวเป็น non-sargable (ครอบด้วย function)
-- ก็ยังได้ประโยชน์จาก index scan ที่เล็กกว่า full row scan มาก
-- InnoDB ADD INDEX เป็น online DDL (INPLACE) — import ที่กำลังรันไม่ถูก block
ALTER TABLE `person` ADD INDEX IF NOT EXISTS `idx_person_cid` (`cid`);
ALTER TABLE `labfu` ADD INDEX IF NOT EXISTS `idx_labfu_labtest_dateserv_cid` (`labtest`, `date_serv`, `cid`);
ALTER TABLE `diagnosis_opd` ADD INDEX IF NOT EXISTS `idx_diagnosis_opd_diagcode_dateserv_cid` (`diagcode`, `date_serv`, `cid`);
ALTER TABLE `diagnosis_ipd` ADD INDEX IF NOT EXISTS `idx_diagnosis_ipd_diagcode_admit_cid` (`diagcode`, `datetime_admit`, `cid`);
