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

## ลำดับการรัน (`run_order.js`)

รอบเต็มรันไฟล์ `sql/*.sql` ตามลำดับที่ `listSqlFiles` คืน — ลำดับมาจาก
[transform/run_order.js](../transform/run_order.js) ไม่ใช่การเรียงตามชื่อไฟล์เฉย ๆ

- `RUN_ORDER` เป็น array ชื่อไฟล์ (lowercase) = source of truth ของลำดับ; ไฟล์
  ที่ **ไม่อยู่ในลิสต์** รันต่อท้ายโดยเรียงตามชื่อ (alphabetical)
- ใช้เมื่อ transform หนึ่งอ่าน**ตารางสรุปของอีก transform** เป็นต้นทาง — ตัวที่
  เป็นต้นทางต้องอยู่ก่อนในลิสต์ ไม่งั้นจะได้ข้อมูลรอบก่อน (ค้าง 1 วัน) หรือ
  ตารางว่างในรอบแรก. ตัวอย่าง: `t_person_dm_ht` อ่าน `t_person_type_1_3` →
  `t_person_type_1_3.sql` ต้องมาก่อน `t_person_dm_ht.sql` (โดยชื่อ 'dm_ht'
  เรียงมาก่อน 'type_1_3' ตามตัวอักษร — ถ้าไม่ระบุลำดับจะรันผิด)
- ถ้าเพิ่ม transform ที่มี dependency ต้อง**ลงทะเบียนใน `RUN_ORDER`** ให้ครบและ
  เรียงถูก + เพิ่ม test ยืนยันลำดับใน `tests/run_transform.test.mjs`

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

## เพิ่ม transform ใหม่ (ทำตามลำดับ)

1. **research transform table ที่มีอยู่ก่อน** — อ่าน `transform/transform_data_dic.json`
   (+ `transform/sql/*.sql`) ว่ามีตารางสรุปที่เก็บ population/คอลัมน์ที่ต้องการ
   อยู่แล้วหรือไม่ ถ้ามีให้ **ต่อยอดจากตารางสรุปนั้น ไม่ query raw ซ้ำ** (เช่น
   `t_person_dm_ht` ดึงทะเบียน/pid/hn/nation จาก `t_person_type_1_3` แทน raw
   `person`) — ประหยัดงาน + ได้ค่าตรงกันทั้งระบบ (single source of truth)
2. ถ้าไปอ่านตารางสรุปของ transform อื่น → **ลงทะเบียนลำดับใน `run_order.js`**
   (ดูหัวข้อ "ลำดับการรัน" ด้านบน) ให้ตัวต้นทางรันก่อน
3. เขียนไฟล์ SQL ตาม "กติกาการเขียนไฟล์ SQL" (full replace, DROP ก่อน CREATE ฯลฯ)
4. เพิ่ม entry ใน `transform_data_dic.json` (ดูด้านล่าง)
5. เพิ่ม test ใน `tests/` — read-source assertion ของ SQL + ลำดับใน run_order ถ้ามี

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
