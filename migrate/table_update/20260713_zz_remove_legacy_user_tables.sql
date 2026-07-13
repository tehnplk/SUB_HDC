-- ตารางผู้ใช้เดิม (`user_provider`, `c_role`) เลิกใช้แล้ว — โมเดลใหม่คือ
-- `c_user_provider` + `c_user_role` ตกลงกับ user ว่า **ลบทิ้งได้เลย ไม่ migrate
-- ข้อมูลเดิม** (ผู้ใช้ ProviderID จะถูกสร้างใหม่ตอน login ครั้งถัดไป)
DROP TABLE IF EXISTS `user_provider`;
DROP TABLE IF EXISTS `c_role`;
