# Hand-off: Migrate

## มาตรฐาน

งาน DB migration เป็น container ของตัวเอง:

- Container: `sub_hdc_migrate` — build จาก [migrate/Dockerfile](../migrate/Dockerfile)
  (image `sub-hdc-migrate` แยกจาก image webapp — dep เดียว: `mysql2`)
- เป็น **one-shot**: รัน migration จบแล้ว exit (`restart: "no"` — ห้ามเปลี่ยน
  ไม่งั้นวนรันซ้ำ)
- `webapp` / `importer` / `cache` / `transform` มี `depends_on: migrate:
  condition: service_completed_successfully` — start ก็ต่อเมื่อ migration จบ
  ด้วย exit 0 เท่านั้น
- webapp ไม่ override `command` — ใช้ `CMD ["npm","run","start"]` จาก Dockerfile

## โครงสร้าง

```text
migrate/
  Dockerfile           # node:20-alpine, npm ci, CMD node run_migrations.js
  .dockerignore        # กัน table/, table_update/, tests/ เข้า build context
  package.json         # dep เดียว: mysql2
  run_migrations.js
  table/               # schema เริ่มต้น + lookup/ dumps
  table_update/        # migrations
  tests/
```

SQL **ไม่ได้ฝังใน image** — mount สดจาก host (แก้ SQL แล้วรันได้เลยไม่ต้อง rebuild):

```yaml
# service mariadb — initial schema ตอน init DB ครั้งแรก
- ./migrate/table:/docker-entrypoint-initdb.d:ro
# service migrate
- ./migrate/table_update:/migrate/table_update:ro
- ./migrate/table/lookup:/migrate/table/lookup:ro
```

## พฤติกรรม run_migrations.js

- ใช้ตาราง `schema_migrations` กันรันซ้ำ — `docker compose up` ทุกครั้ง
  migrate รันหนึ่งรอบ ของที่ apply แล้วขึ้น `skipped` แล้ว exit
- **migration ปกติ** (`table_update/*.sql`): id = ชื่อไฟล์ รันครั้งเดียวตลอดชีพ
- **lookup dumps** (`table/lookup/*.sql`): id ผูก content hash — แก้ไฟล์แล้ว
  hash เปลี่ยน → โหลดซ้ำเองรอบถัดไป (dump เป็น DROP+CREATE+INSERT รันซ้ำ
  ปลอดภัย) ครอบไซต์เก่าที่ initdb ของ MariaDB ไม่รันซ้ำ
- env: ใน container ได้จาก `env_file: ./webapp/.env`; รัน local ใช้
  `process.loadEnvFile()` โหลด `webapp/.env` ให้เอง — รันจาก repo root:
  `node migrate/run_migrations.js`
- ต่อ DB แบบ retry 180 รอบ × 1 วินาที — รอ MariaDB start ได้เอง

## Deploy

- `c_user_role` is seeded with fixed IDs: `1=admin`, `2=superuser`, `3=user`, `4=guest` in both the initial schema and an idempotent migration. The migration validates this mapping before it is recorded.
- Legacy `user_provider` and `c_role` are removed by a guarded migration. Existing providers and custom roles are copied into `c_user_provider` and `c_user_role`, validated, and only then are the old tables dropped.
- Avoid `current_role` as a MariaDB table alias because it is reserved; the legacy cleanup migration uses `mapped_role`.

```powershell
docker compose up -d --build
```

ใช้แบบ**ไม่ระบุ service** เพื่อให้ build ทั้ง `sub-hdc-webapp` และ
`sub-hdc-migrate`

ถ้า migration fail → migrate exit ไม่เป็น 0 → webapp/importer/cache/transform
ไม่ start ดู log:

```powershell
docker logs sub_hdc_migrate
```

## การทดสอบ

```powershell
cd migrate
npm install          # ครั้งแรกบนเครื่องใหม่
node --test tests\*.test.mjs
```
