# transform/sql — คิวรี่สร้างตารางสรุป `s_*`

วางไฟล์ `.sql` ที่นี่ container `sub_hdc_transform` รันให้ทุกไฟล์
**วันละครั้งเวลา 00:00** และรันไฟล์ใน `TRANSFORM_HOURLY_SQL_FILES`
เพิ่มทุกต้นชั่วโมง (ค่าเริ่มต้น `s_visit_monthly.sql`) — ไม่รันรอบแรกตอน
container start เว้นแต่ตั้ง `TRANSFORM_RUN_ON_START=true` —
โฟลเดอร์ mount สด แก้ไฟล์แล้วมีผลรอบถัดไปไม่ต้อง rebuild
ถ้าถึงรอบแล้วกำลัง import จะเลื่อนไป retry ทุก 5 นาทีจน import จบ

ไฟล์ต้อง self-contained รันซ้ำได้และใช้ full replace เพื่อเคลียร์แถวที่หายจากต้นทาง:

```sql
CREATE TABLE IF NOT EXISTS `s_x` (...);

START TRANSACTION;
DELETE FROM `s_x`;
INSERT INTO `s_x` SELECT ...;
COMMIT;
```

ห้าม `DROP TABLE` ใน recurring transform; ถ้าต้องแก้ schema ให้ทำ migration
แบบ one-time เพื่อให้ข้อมูลรอบเดิมยังอยู่เมื่อ transform fail

ปรับรอบ: env `TRANSFORM_RUN_AT` (HH:MM, default 00:00) /
`TRANSFORM_HOURLY_SQL_FILES` (default `s_visit_monthly.sql`) /
`TRANSFORM_RUN_ON_START` (default false) / `TRANSFORM_POLL_MS`
ดู log: `docker logs sub_hdc_transform`
