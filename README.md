# SUB HDC

ระบบนำเข้าและตรวจสอบข้อมูล F43 ZIP ด้วย Next.js และ MariaDB

## สิ่งที่ต้องมี

- Docker / Docker Compose
- Git

## Fresh Deploy

1. Clone repo

```bash
git clone https://github.com/tehnplk/SUB_HDC.git
cd SUB_HDC
```

2. สร้างไฟล์ env

```bash
cp webapp/.env.example webapp/.env
```

แก้ค่าใน `webapp/.env` ให้ตรงเครื่องจริง เช่น `DB_PASSWORD`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `CENTER_NAME`

3. Deploy ใหม่ทั้งหมด

```bash
docker compose --env-file webapp/.env down -v
docker compose --env-file webapp/.env up -d --build
```

คำสั่งนี้จะลบ volume เดิม และสร้างฐานข้อมูลใหม่จากไฟล์ใน `table/*.sql`

4. ตรวจสถานะ

```bash
docker compose --env-file webapp/.env ps
docker compose --env-file webapp/.env logs -f webapp
```

## URL

- Web: `http://localhost`
- MariaDB: `localhost:3308`

## Update App Only

```bash
git pull
docker compose --env-file webapp/.env up -d --build webapp
```

## หมายเหตุ

- ไฟล์ schema อยู่ใน `table/{table_name}.sql`
- ไม่ใช้โฟลเดอร์ `init_db` แล้ว
- ถ้าต้องการเปลี่ยน port ให้ตั้งค่า `WEB_PORT` หรือ `DB_PUBLISHED_PORT` ก่อนรัน compose
