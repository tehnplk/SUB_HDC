# Hand-off: Sync

## มาตรฐาน

ระบบ sync ส่งข้อมูลสรุปจากหน่วยบริการขึ้น center (`https://subhdc.plkhealth.go.th`)
และดึงนิยาม SQL สำหรับนับ KPI ลงมารันในเครื่อง

- Container: `sub_hdc_sync` — build จาก [sync/Dockerfile](../sync/Dockerfile)
  (node:20-alpine + crond)
- ตอน start: `setup_cron.js` เขียน crontab จาก `sync-jobs.json` แล้วรัน `crond -f`
- `SYNC_RUN_ON_START=true` → ทุก job รันทันทีหนึ่งรอบตอน container start
- โค้ด bind mount `./sync:/sync` — แก้สคริปต์แล้วมีผลรอบ cron ถัดไปโดยไม่ต้อง
  rebuild (ยกเว้น `setup_cron.js`/`sync-jobs.json` ที่ต้อง restart container
  เพื่อเขียน crontab ใหม่)

## โครงสร้างโฟลเดอร์

```text
sync/
  Dockerfile
  setup_cron.js        # เขียน crontab + รัน startup jobs
  sync-jobs.json       # รายการ job (name/script/cron/enabled)
  jobs/
    sync_config.js     # config กลาง: URL/secret/JWT (อ่านจาก env ล้วน)
    post_check_sub_center.js
    post_sync_kpi.js
    pull_sql_for_sync_data.js
    hdc/               # jobs ดึงข้อมูลจาก HDC opendata API
      hdc_api_s_persontype.js
  tests/
```

## Config — env ล้วน

repo เป็น public — **ห้ามมี secret ในไฟล์ที่ commit** config ทั้งหมดอยู่ใน
`webapp/.env` (gitignore) ซึ่ง compose ส่งเข้า container ผ่าน `env_file`:

```env
SSJ_BASE_URL=https://subhdc.plkhealth.go.th
SSJ_ENDPOINT_GET_SQL=/api/sync-sql
SSJ_ENDPOINT_POST=/api/data-sync-in
SSJ_SYNC_SECRET=...   # ตัวเดียวที่เป็นความลับ — sign JWT HS256 เรียก endpoint GET
```

- ทุกตัวมี default เป็นค่า production ใน `sync_config.js` — ไซต์ทั่วไปตั้งแค่
  `SSJ_SYNC_SECRET` ก็พอ ถ้า env ไม่ตั้ง job `refresh_sync_sql_data` จะ fail
  ตอน sign JWT (job POST อื่นไม่กระทบ — endpoint POST เป็น public)
- `setup_cron.js` มี `ENV_NAMES` ระบุ env ที่ถูกเขียนลงหัว crontab — เพิ่ม env
  ใหม่ต้องเพิ่มในลิสต์นี้ด้วย ไม่งั้น cron job มองไม่เห็น
- แก้ `.env` แล้วต้อง recreate container (`docker compose up -d sync`) เพราะ
  `env_file` อ่านตอนสร้าง container เท่านั้น

## Jobs

| job | cron | หน้าที่ |
|---|---|---|
| `check` | `*/30 * * * *` | POST เช็คสถานะ/เวอร์ชัน sub center |
| `sync_kpi` | `* * * * *` | ปลุกทุกนาที — รัน SQL แต่ละ topic ตาม `interval_minute` ของแถวใน `sql_for_sync_data` (default 90 นาที) แล้ว POST ผลขึ้น center |
| `refresh_sync_sql_data` | `*/15 * * * *` | GET นิยาม SQL จาก center (JWT auth) ลงตาราง `sql_for_sync_data` |
| `hdc_api_s_persontype` | `0 3 * * *` | ดึง `s_persontype` จาก HDC opendata API ลงตาราง `hdc_api_s_persontype` |

## Jobs กลุ่ม HDC (`jobs/hdc/`)

ดึงข้อมูลสรุปจาก HDC opendata API (`https://opendata.moph.go.th/api/report_data`
— POST public ไม่ต้อง auth) มาเก็บ local:

- `hdc_api_s_persontype` — ดึง `s_persontype` ทั้งจังหวัดของปีงบประมาณ
  ปัจจุบัน (ตั้งแต่ ต.ค. นับเป็นปีถัดไป) ลงตาราง `hdc_api_s_persontype`
  (สร้างโดย migration `20260711_create_hdc_api_s_persontype.sql`;
  PK = `b_year, hospcode`)
- เขียนแบบ **full replace เฉพาะปีที่ดึง**: `DELETE ... WHERE b_year = ?` +
  `INSERT` ใน transaction เดียว — ปีเก่าคงไว้เป็นประวัติ; payload ว่างจาก
  API → ปฏิเสธ ไม่ล้างข้อมูลเดิม
- env (มี default ครบ ไม่ต้องตั้งก็ได้): `HDC_API_URL`,
  `HDC_API_PROVINCE` (default `65`), `HDC_API_YEAR` (override ปี เช่น
  ดึงย้อนหลัง) — อยู่ใน `ENV_NAMES` ของ `setup_cron.js` แล้ว

## ตาราง `sql_for_sync_data`

- `topic` เป็น `NOT NULL` + `UNIQUE`
- `d_update` มาจาก center (เวลาแก้นิยามที่ส่วนกลาง — ห้ามใช้ NOW ตอน pull
  ไม่งั้นแยกเวอร์ชันไม่ออก)
- **Pull เป็นแบบ full replace**: `DELETE FROM` + `INSERT` ทุกแถวใน transaction
  เดียว — ใช้ `DELETE` ไม่ใช่ `TRUNCATE` (TRUNCATE เป็น DDL implicit commit,
  rollback ไม่ได้)
  - payload ว่างจาก center → ปฏิเสธ ไม่ล้างตาราง (กัน API ล่มชั่วคราวแล้ว
    นิยามหายเกลี้ยง)
  - insert พังกลางทาง → rollback กลับเป็นชุดเดิม

## การทดสอบ

```powershell
cd sync
npm install          # ครั้งแรกบนเครื่องใหม่
node --test tests\*.test.mjs
```

compose-level assertions อยู่ที่ `webapp/tests/docker-compose-migrations.test.mjs`
(รายการ jobs + env ของ service sync)

## HDC report metadata sync

- Job: `hdc_api_report` (`jobs/hdc/hdc_api_report.js`)
- Schedule: daily at `03:30` via `sync-jobs.json`
- Source: GET `/category`, followed by GET `/report/{cat_id}` for every category
- Destination: `hdc_api_report`, created by migration
  `20260712_create_hdc_api_report.sql`
- Write behavior: transactional upsert by `id`; empty API payloads are rejected so
  existing rows remain intact
- Optional env: `HDC_API_BASE_URL` (default `https://opendata.moph.go.th/api`)
