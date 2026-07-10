# Hand-off: Sync

## ภาพรวม

ระบบ sync ส่งข้อมูลสรุปจากหน่วยบริการขึ้น center (`https://subhdc.plkhealth.go.th`)
และดึงนิยาม SQL สำหรับนับ KPI ลงมารันในเครื่อง

- Container: `sub_hdc_sync` — build จาก [sync/Dockerfile](../sync/Dockerfile) (node:20-alpine + crond)
- ตอน start: `setup_cron.js` เขียน crontab จาก `sync-jobs.json` แล้วรัน `crond -f`
- `SYNC_RUN_ON_START=true` → ทุก job รันทันทีหนึ่งรอบตอน container start
- โค้ด bind mount `./sync:/sync` — แก้สคริปต์แล้วมีผลรอบ cron ถัดไปโดยไม่ต้อง rebuild
  (ยกเว้น `setup_cron.js`/`sync-jobs.json` ที่ต้อง restart container เพื่อเขียน crontab ใหม่)

## โครงสร้างโฟลเดอร์

```text
sync/
  Dockerfile
  setup_cron.js        # เขียน crontab + รัน startup jobs
  sync-jobs.json       # รายการ job (name/script/cron/enabled)
  jobs/                # เดิมชื่อ post/ — เปลี่ยนชื่อเพราะมี job ฝั่ง GET ด้วย
    sync_config.js     # config กลาง: URL/secret/JWT (อ่านจาก env ล้วน)
    post_check_sub_center.js
    post_sync_kpi.js
    pull_sql_for_sync_data.js
  tests/
```

`post_count_file_service.js` (job `service_count` นับแถวแฟ้ม service รายชั่วโมง)
**ถูกลบออกแล้ว** — center จะไม่ได้รับ topic `service_count` อีก

## Config — env ล้วน (2026-07-10)

`sync/config_sync.json` และ `config_sync.example.json` **ถูกลบแล้ว** เพราะ repo เป็น
public และไฟล์มี secret. config ทั้งหมดย้ายไป `webapp/.env` (gitignore) ซึ่ง compose
ส่งเข้า container ผ่าน `env_file`:

```env
SSJ_BASE_URL=https://subhdc.plkhealth.go.th
SSJ_ENDPOINT_GET_SQL=/api/sync-sql
SSJ_ENDPOINT_POST=/api/data-sync-in
SSJ_SYNC_SECRET=...   # ตัวเดียวที่เป็นความลับ — sign JWT HS256 เรียก endpoint GET
```

- ทุกตัวมี default เป็นค่า production ใน `sync_config.js` — ไซต์ทั่วไปตั้งแค่
  `SSJ_SYNC_SECRET` ก็พอ **ไม่มี fallback อ่าน secret จากไฟล์แล้ว** ถ้า env ไม่ตั้ง
  job `refresh_sync_sql_data` จะ fail ตอน sign JWT (job POST อื่นไม่กระทบ — endpoint
  POST เป็น public)
- `setup_cron.js` มี `ENV_NAMES` ระบุ env ที่ถูกเขียนลงหัว crontab — เพิ่ม env ใหม่
  ต้องเพิ่มในลิสต์นี้ด้วย ไม่งั้น cron job มองไม่เห็น
- แก้ `.env` แล้วต้อง recreate container (`docker compose up -d sync`) เพราะ
  `env_file` อ่านตอนสร้าง container เท่านั้น
- secret ไม่เคยถูก commit (ไฟล์เดิมถูก gitignore มาตลอด) — ไม่ต้องล้าง history

## Jobs ปัจจุบัน

| job | cron | หน้าที่ |
|---|---|---|
| `check` | `*/30 * * * *` | POST เช็คสถานะ/เวอร์ชัน sub center |
| `sync_kpi` | `* * * * *` | ปลุกทุกนาที — รัน SQL แต่ละ topic ตาม `interval_minute` ของแถวใน `sql_for_sync_data` (default 90 นาที) แล้ว POST ผลขึ้น center |
| `refresh_sync_sql_data` | `*/15 * * * *` | GET นิยาม SQL จาก center (JWT auth) ลงตาราง `sql_for_sync_data` |

## ตาราง `sql_for_sync_data`

- `topic` เป็น `NOT NULL` + `UNIQUE` — schema ใหม่ใน `table/sql_for_sync_data.sql`,
  DB เดิมผ่าน `table_update/20260710_make_sql_sync_topic_unique.sql`
- `d_update` มาจาก center (เวลาแก้นิยามที่ส่วนกลาง — ห้ามใช้ NOW ตอน pull ไม่งั้น
  แยกเวอร์ชันไม่ออก) มี `DEFAULT current_timestamp()` เป็น fallback สำหรับ insert มือ
- **Pull เป็นแบบ full replace**: `DELETE FROM` + `INSERT` ทุกแถวใน transaction เดียว
  (แถวที่ถูกลบที่ center จึงหายจาก local ด้วย) — ใช้ `DELETE` ไม่ใช่ `TRUNCATE`
  เพราะ TRUNCATE เป็น DDL implicit commit, rollback ไม่ได้
  - payload ว่างจาก center → ปฏิเสธ ไม่ล้างตาราง (กัน API ล่มชั่วคราวแล้วนิยามหายเกลี้ยง)
  - insert พังกลางทาง → rollback กลับเป็นชุดเดิม

## การทดสอบ

```powershell
cd sync
npm install          # ครั้งแรกบนเครื่องใหม่
node --test tests\*.test.mjs   # 8 tests
```

compose-level assertions อยู่ที่ `webapp/tests/docker-compose-migrations.test.mjs`
(รายการ jobs + env ของ service sync)
