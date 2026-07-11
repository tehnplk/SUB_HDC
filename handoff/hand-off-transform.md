# Hand-off: Transform

## มาตรฐาน

ระบบ transform รันไฟล์ `transform/sql/*.sql` สร้างตารางสรุป (`s_*`, `t_*`)
จากตารางแฟ้มดิบ ให้หน้า dashboard/report/API ใช้ — ไม่แตะข้อมูลดิบ

- Container: `sub_hdc_transform` — daemon [transform/run_transform.js](../transform/run_transform.js)
  ถูก **bake ใน image** แก้แล้วต้อง `docker compose up -d --build transform`
- SQL: `./transform/sql` เป็น **bind mount สด** (`:ro`) — เพิ่ม/แก้คิวรี่
  มีผลรอบถัดไปทันที ไม่ต้อง rebuild
- env จาก `webapp/.env`; รัน local นอก docker daemon โหลด `webapp/.env`
  ให้เอง

## ตารางเวลา

| env | default | ความหมาย |
|---|---|---|
| `TRANSFORM_RUN_AT` | `23:00` | รอบเต็มวันละครั้ง (TZ Asia/Bangkok) |
| `TRANSFORM_RUN_ON_START` | `false` | ไม่รันตอน container start |
| `TRANSFORM_HOURLY_SQL_FILES` | `s_visit_montly.sql` | ไฟล์ที่รันเพิ่มทุกต้นชั่วโมง |
| `TRANSFORM_POLL_MS` | 300000 | จังหวะ retry เมื่อรอบถูกเลื่อน |

- ถ้ากำลัง import (`log_import_file` มี pending/processing) รอบถูกเลื่อน
  แล้ว retry จนสำเร็จ — เช็คซ้ำก่อนทุกไฟล์
- ไฟล์ไหน error ข้ามไปไฟล์ถัดไป ไม่ล้มทั้งรอบ
- ทุก task log ลง `log_transform` — แถวที่ `finish_at` เป็น NULL คือรอบ fail;
  หน้าเว็บใช้ `finish_at` ล่าสุดแสดง "Transform ล่าสุด"

## สั่งรันเองหนึ่งรอบ

`runOnce(files)` ถูก export ไว้ — ไม่ส่ง `files` = รันทุกไฟล์

```powershell
# เครื่อง dev (DB local :3308) — ต้อง override DB_HOST เป็น localhost
cd transform
$env:DB_HOST = "localhost"; node -e "require('./run_transform.js').runOnce(['./sql/<file>.sql']).then(ok=>process.exit(ok?0:2))"
```

```bash
# host production — รันใน container
docker exec sub_hdc_transform node -e "require('/transform/run_transform.js').runOnce(['/transform/sql/<file>.sql']).then(ok=>process.exit(ok?0:2))"
```

## กติกาการเขียนไฟล์ SQL

- **full replace เสมอ**: `START TRANSACTION; DELETE FROM ...; INSERT ...; COMMIT;`
  — ห้าม upsert (`ON DUPLICATE KEY UPDATE`) เพราะแถวของต้นทางที่ถูกลบจะค้าง
  ในตารางสรุป และห้าม `TRUNCATE` (DDL implicit commit, rollback ไม่ได้)
- **แก้ schema ต้อง `DROP TABLE IF EXISTS` ก่อน CREATE** — ไซต์เก่ามีตารางเดิม
  อยู่ `CREATE TABLE IF NOT EXISTS` เฉย ๆ จะไม่ได้โครงสร้างใหม่
- temp table ใช้ได้ (`CREATE/DROP TEMPORARY` ไม่ implicit commit
  อยู่ใน transaction ได้)
- 1 คอลัมน์ = 1 ความหมาย ค่าหลายตัวคั่นด้วย `,` ไม่ครอบ `[ ]`;
  คอลัมน์คู่ที่ตำแหน่งต้องตรงกัน (เช่น `hos_dx_*` ↔ `date_dx_*`) ต้อง
  `GROUP_CONCAT ... ORDER BY` ตัวเดียวกัน และเก็บค่าว่างเป็นช่องว่าง ไม่ข้าม
- ตารางทะเบียนรายคน: 1 cid = 1 แถว

## Deploy

- แก้เฉพาะ `sql/*.sql` → บน host แค่ `git pull` แล้วสั่ง `runOnce`
  ถ้าไม่อยากรอรอบ 23:00
- แก้ `run_transform.js` → `git pull && docker compose up -d --build transform`

## การทดสอบ

```powershell
cd transform
npm install          # ครั้งแรกบนเครื่องใหม่
node --test tests\*.test.mjs
```

## Transform data dictionary

เมื่อสร้าง transform ใหม่ ต้องเพิ่มข้อมูลใน `transform/transform_data_dic.json` ทุกครั้ง
โดย 1 transform = 1 object และต้องมี key ดังนี้:

- `transform_table`: ชื่อตารางผลลัพธ์ของ transform
- `sql_file`: ชื่อไฟล์ SQL ที่ใช้ transform
- `f43_tables`: รายชื่อตาราง F43 ต้นทาง
- `stored_data`: คำอธิบายว่า transform เก็บข้อมูลอะไร
- `schema`: รายชื่อคอลัมน์ของตารางผลลัพธ์ เป็น text คั่นด้วย comma เช่น `hospcode,pid,...`

ดูข้อมูลผ่าน DataGrid ได้ที่ `/dev/tranforms-data-dict` ซึ่งอ่านจาก
`/api/dev/transform-data-dict` และไฟล์ `transform/transform_data_dic.json`.
คลิก `sql_file` เพื่อดู SQL code และ Copy ได้จาก modal.
Floating user menu มีรายการ `Profile`, `Transform Dict`, และ `Logout` เท่านั้น.
