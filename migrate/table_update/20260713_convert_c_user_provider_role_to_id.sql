INSERT INTO `c_user_role` (`role`, `is_active`, `note`)
VALUES ('admin', 1, 'System administrator'), ('superuser', 1, 'All individual data'), ('user', 1, 'Standard ProviderID user'), ('guest', 1, 'Summary data only')
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`);

-- schema ทั้งระบบไม่ใช้ foreign key (c_user_role เป็น lookup คงที่ 4 แถว ค่า role
-- คุมจากแอป) — ถอด FK ที่อาจค้างจากรอบก่อน (ADD ซ้ำชื่อทำ migrate ล้ม errno 121)
ALTER TABLE `c_user_provider` DROP FOREIGN KEY IF EXISTS `fk_c_user_provider_role`;

-- map ชื่อ role -> id: บังคับสองฝั่งเป็น utf8mb3 (CONVERT ... USING) กัน
-- "Truncated incorrect DECIMAL value" (ถ้า role เป็น int แล้ว) และ "Illegal mix of
-- collations" (ถ้าตารางยังเป็น utf8mb4) ที่ทำ migrate ล้มใน strict mode
UPDATE `c_user_provider` AS u
INNER JOIN `c_user_role` AS r
  ON CONVERT(r.`role` USING utf8mb3) = CONVERT(u.`role` USING utf8mb3)
SET u.`role` = r.`id`;

ALTER TABLE `c_user_provider` MODIFY COLUMN `role` int(10) unsigned NOT NULL;

-- collation มาตรฐานของโปรเจกต์คือ utf8mb3_general_ci — แปลงตารางที่เคยถูกสร้างเป็น
-- utf8mb4 ให้ตรงมาตรฐาน (ตารางที่เป็น utf8mb3_general_ci อยู่แล้วรันซ้ำไม่มีผล)
ALTER TABLE `c_user_role` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `c_user_provider` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
