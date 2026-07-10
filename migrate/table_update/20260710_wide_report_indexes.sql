-- Index ชุดที่สามต่อจาก 20260710_report_query_indexes / 20260710_service_drug_indexes:
-- ครอบทุกตารางหลักที่เหลือซึ่งใหญ่พอให้ full scan ช้า (>= ~60k แถวที่ไซต์ใหญ่สุด
-- คือ อ.เมือง ณ 2026-07-10) — ตารางเล็กกว่านั้นข้าม เพราะ index มีต้นทุนตอน
-- LOAD DATA ของ import ทุกครั้งแต่แทบไม่ช่วย query
--
-- pattern เดิม: (cid, วันที่) = join รายคนจาก person/diagnosed แล้วกรองช่วงวันที่,
-- (วันที่, cid) = กวาดช่วงเวลาทั้งอำเภอ (นับงาน/นับคนรายเดือน — ใส่เฉพาะตาราง
-- ที่โดนกวาดบ่อย: nutrition, chronicfu), (รหัส, วันที่, cid) = filter
-- ด้วยรหัสหัตถการ/วัคซีน/PP special แบบเดียวกับ diagcode/didstd
-- charge_opd / charge_ipd จงใจไม่ทำ index: สองตารางใหญ่สุด (6.9M / 2.1M แถวที่
-- อ.เมือง) ต้นทุน index maintenance ตอน LOAD DATA สูงสุด (+129% จาก benchmark)
-- แต่รายงานใช้น้อย
ALTER TABLE `nutrition` ADD INDEX IF NOT EXISTS `idx_nutrition_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `nutrition` ADD INDEX IF NOT EXISTS `idx_nutrition_dateserv_cid` (`date_serv`, `cid`);
ALTER TABLE `procedure_opd` ADD INDEX IF NOT EXISTS `idx_procedure_opd_procedcode_dateserv_cid` (`procedcode`, `date_serv`, `cid`);
ALTER TABLE `procedure_opd` ADD INDEX IF NOT EXISTS `idx_procedure_opd_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `specialpp` ADD INDEX IF NOT EXISTS `idx_specialpp_ppspecial_dateserv_cid` (`ppspecial`, `date_serv`, `cid`);
ALTER TABLE `specialpp` ADD INDEX IF NOT EXISTS `idx_specialpp_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `appointment` ADD INDEX IF NOT EXISTS `idx_appointment_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `card` ADD INDEX IF NOT EXISTS `idx_card_cid` (`cid`);
ALTER TABLE `chronicfu` ADD INDEX IF NOT EXISTS `idx_chronicfu_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `chronicfu` ADD INDEX IF NOT EXISTS `idx_chronicfu_dateserv_cid` (`date_serv`, `cid`);
ALTER TABLE `address` ADD INDEX IF NOT EXISTS `idx_address_cid` (`cid`);
ALTER TABLE `chronic` ADD INDEX IF NOT EXISTS `idx_chronic_chronic_cid` (`chronic`, `cid`);
ALTER TABLE `chronic` ADD INDEX IF NOT EXISTS `idx_chronic_cid` (`cid`);
ALTER TABLE `rehabilitation` ADD INDEX IF NOT EXISTS `idx_rehabilitation_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `procedure_ipd` ADD INDEX IF NOT EXISTS `idx_procedure_ipd_procedcode_admit_cid` (`procedcode`, `datetime_admit`, `cid`);
ALTER TABLE `accident` ADD INDEX IF NOT EXISTS `idx_accident_cid_datetimeserv` (`cid`, `datetime_serv`);
ALTER TABLE `epi` ADD INDEX IF NOT EXISTS `idx_epi_vaccinetype_dateserv_cid` (`vaccinetype`, `date_serv`, `cid`);
ALTER TABLE `epi` ADD INDEX IF NOT EXISTS `idx_epi_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `ncdscreen` ADD INDEX IF NOT EXISTS `idx_ncdscreen_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `dental` ADD INDEX IF NOT EXISTS `idx_dental_cid_dateserv` (`cid`, `date_serv`);
