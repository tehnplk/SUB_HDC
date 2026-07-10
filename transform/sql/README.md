# transform/sql — คิวรี่สร้างตารางสรุป `s_*`

วางไฟล์ `.sql` ที่นี่ container `sub_hdc_transform` รันให้ทุกไฟล์
**วันละครั้งเวลา 00:00** (+ รอบแรกตอน container start) เรียงตามชื่อไฟล์ —
โฟลเดอร์ mount สด แก้ไฟล์แล้วมีผลรอบถัดไปไม่ต้อง rebuild
ถ้าถึงรอบแล้วกำลัง import จะเลื่อนไป retry ทุก 5 นาทีจน import จบ

ไฟล์ต้อง self-contained รันซ้ำได้ — แบบ upsert:

```sql
CREATE TABLE IF NOT EXISTS `s_x` (...);

INSERT INTO `s_x` (...)
SELECT ...
ON DUPLICATE KEY UPDATE ...;
```

หรือแบบ full replace (เคลียร์แถวที่หายจากต้นทางด้วย):

```sql
CREATE TABLE IF NOT EXISTS `s_x` (...);

START TRANSACTION;
DELETE FROM `s_x`;
INSERT INTO `s_x` SELECT ...;
COMMIT;
```

ปรับรอบ: env `TRANSFORM_RUN_AT` (HH:MM, default 00:00) /
`TRANSFORM_RUN_ON_START` (default true) / `TRANSFORM_POLL_MS`
ดู log: `docker logs sub_hdc_transform`
