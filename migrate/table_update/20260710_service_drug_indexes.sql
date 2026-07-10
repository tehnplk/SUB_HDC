-- Index ชุดที่สองต่อจาก 20260710_report_query_indexes: ตาราง service (visit หลัก)
-- และ drug_opd/drug_ipd — pattern เดียวกับรายงาน DM/HbA1c คือ filter รหัส + ช่วง
-- วันที่ แล้ว join รายคนด้วย cid
--
-- service ถูก query สองทิศ: (1) join รายคนจาก person/diagnosed ด้วย cid แล้วกรอง
-- วันที่ (2) กวาดช่วงวันที่ทั้งอำเภอ (นับ visit/OP รายเดือน) — ทิศทางใช้ index
-- คนละตัว จึงใส่ทั้ง (cid, date_serv) และ (date_serv, cid); hospcode ติดมากับ
-- secondary index โดยปริยาย (InnoDB เก็บ PK ไว้ที่ leaf) จึง covering ทั้งคู่
-- drug_* ใช้ didstd นำแบบเดียวกับ diagcode ของ diagnosis_*
ALTER TABLE `service` ADD INDEX IF NOT EXISTS `idx_service_cid_dateserv` (`cid`, `date_serv`);
ALTER TABLE `service` ADD INDEX IF NOT EXISTS `idx_service_dateserv_cid` (`date_serv`, `cid`);
ALTER TABLE `drug_opd` ADD INDEX IF NOT EXISTS `idx_drug_opd_didstd_dateserv_cid` (`didstd`, `date_serv`, `cid`);
ALTER TABLE `drug_ipd` ADD INDEX IF NOT EXISTS `idx_drug_ipd_didstd_admit_cid` (`didstd`, `datetime_admit`, `cid`);
