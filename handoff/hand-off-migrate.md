# Hand-off: Migrate

## ภาพรวม

งาน DB migration แยกเป็น container ของตัวเองแล้ว (2026-07-10) — เดิม webapp รัน
`node lib/run_migrations.js && npm run start` ใน command เดียว ตอนนี้:

- Container: `sub_hdc_migrate` — build จาก [migrate/Dockerfile](../migrate/Dockerfile)
  (image `sub-hdc-migrate` — แยกจาก image webapp, เล็กเพราะ dep มีแค่ `mysql2`
  ไม่มี Next build)
- เป็น **one-shot**: รัน migration จบแล้ว exit (`restart: "no"` — ห้ามเปลี่ยน
  ไม่งั้นวนรันซ้ำ)
- `webapp` / `importer` / `cache` / `transform` มี `depends_on: migrate:
  condition: service_completed_successfully` — จะ start ก็ต่อเมื่อ migration จบ
  ด้วย exit 0 เท่านั้น (ปิด race เดิมที่ importer อาจ start ก่อน migration เสร็จ)
- webapp ไม่ override `command` แล้ว — ใช้ `CMD ["npm","run","start"]` จาก
  Dockerfile ตรง ๆ

## โครงสร้าง

```text
migrate/
  Dockerfile           # node:20-alpine, npm ci, CMD node run_migrations.js
  .dockerignore        # กัน table/, table_update/, tests/ เข้า build context
  package.json         # dep เดียว: mysql2
  run_migrations.js    # ย้ายมาจาก webapp/lib/run_migrations.js
  table/               # schema เริ่มต้น (ย้ายมาจาก /table) + lookup/ dumps
  table_update/        # migrations (ย้ายมาจาก /table_update)
  tests/
    db-migrations.test.mjs   # ย้ายมาจาก webapp/tests/ (15 tests)
```

SQL อยู่ใน `migrate/` แล้วแต่**ไม่ได้ฝังใน image** — mount สดจาก host ตอนรัน
(แก้ SQL แล้วรันได้เลยไม่ต้อง rebuild):

```yaml
# service mariadb — initial schema ตอน init DB ครั้งแรก
- ./migrate/table:/docker-entrypoint-initdb.d:ro
# service migrate
- ./migrate/table_update:/migrate/table_update:ro
- ./migrate/table/lookup:/migrate/table/lookup:ro
```

## พฤติกรรม run_migrations.js

- สร้าง/ใช้ตาราง `schema_migrations` กันรันซ้ำ — `docker compose up` ทุกครั้ง
  migrate รันหนึ่งรอบ ของที่ apply แล้วขึ้น `skipped` (เร็วมาก) แล้ว exit
- **migration ปกติ** (`table_update/*.sql`): id = ชื่อไฟล์ รันครั้งเดียวตลอดชีพ
- **lookup dumps** (`table/lookup/*.sql`): id ผูก content hash — แก้ไฟล์
  (เช่น เพิ่ม รพ.ใหม่) แล้ว hash เปลี่ยน → โหลดซ้ำเองรอบถัดไป (dump เป็น
  DROP+CREATE+INSERT จึงรันซ้ำปลอดภัย) ครอบไซต์เก่าที่ initdb ของ MariaDB ไม่รันซ้ำ
- env: ใน container ได้จาก `env_file: ./webapp/.env`; รัน local ใช้
  `process.loadEnvFile()` โหลด `webapp/.env` ให้เอง (ตัด `@next/env` แล้ว) —
  รันจาก repo root: `node migrate/run_migrations.js` (default dir อิง cwd)
- ต่อ DB แบบ retry 180 รอบ × 1 วินาที — รอ MariaDB start ได้เอง

## Deploy

```powershell
docker compose up -d --build
```

ใช้แบบ**ไม่ระบุ service** เพื่อให้ build ทั้ง `sub-hdc-webapp` และ `sub-hdc-migrate`
(ของเดิม `--build webapp` build image เดียวพอเพราะ migrate ยืม image webapp —
ตอนนี้ไม่ใช่แล้ว)

ถ้า migration fail → migrate exit ไม่เป็น 0 → webapp/importer/cache/transform ไม่ start
ดู log ได้ที่:

```powershell
docker logs sub_hdc_migrate
```

## สถานะการตรวจ (2026-07-10)

- `migrate/tests` — 15/15 ผ่าน (unit + schema SQL consistency + compose mounts)
- `webapp/tests/docker-compose-migrations.test.mjs` — 3/3 ผ่าน
- `docker compose config` ผ่าน
- **ยังไม่ได้ build/รัน container จริง** — Docker Desktop ปิดอยู่ตอนแยกโฟลเดอร์
  รอบแรกที่เปิดให้สั่ง `docker compose up -d --build` แล้วดูว่า migrate ขึ้น
  `Exited (0)` และทุก service start ตาม

## การทดสอบ

```powershell
cd migrate
npm install          # ครั้งแรกบนเครื่องใหม่
node --test tests\*.test.mjs
```
