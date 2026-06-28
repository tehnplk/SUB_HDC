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

แก้ค่าใน `webapp/.env` ให้ตรงเครื่องจริง เช่น `AUTH_SECRET`, `AUTH_URL`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `CENTER_NAME`

สำหรับ Docker fresh deploy ให้ DB ใน `webapp/.env` เป็นแบบนี้ เพราะ webapp ต่อ MariaDB ผ่าน Docker network:

```env
DB_HOST=mariadb
DB_PORT=3306
DB_USER=root
DB_PASSWORD=112233
DB_DATABASE=sub_hdc
```

ถ้าจะรัน dev นอก Docker และใช้ MySQL ที่เครื่อง host port `3303` ให้แก้ `webapp/.env` เป็น:

```env
DB_HOST=localhost
DB_PORT=3303
DB_USER=root
DB_PASSWORD=112233
DB_DATABASE=sub_hdc
```

3. Deploy ใหม่ทั้งหมด

```bash
docker compose down -v
docker compose up -d --build
```

คำสั่งนี้จะลบ volume เดิม และสร้างฐานข้อมูลใหม่จากไฟล์ใน `table/*.sql`

4. ตรวจสถานะ

```bash
docker compose ps
docker compose logs -f webapp
```

## URL

- Web: `http://localhost`
- MariaDB จากเครื่อง host: `localhost:3308`
- MariaDB ภายใน Docker network: `mariadb:3306`

## Update App Only

```bash
git pull
docker compose up -d --build webapp
```

## หมายเหตุ

- ไฟล์ schema อยู่ใน `table/{table_name}.sql`
- ไม่ใช้โฟลเดอร์ `init_db` แล้ว
- MariaDB ใน Docker ใช้ root password `112233`, database `sub_hdc`, port ภายนอก `3308`
- Web ใน Docker เปิดที่ port `80`
- Webapp อ่านค่า DB จาก `webapp/.env` เท่านั้น
- Docker Compose ไม่ override ค่า DB ของ webapp แล้ว
