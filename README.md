# SUB HDC Production Docker Deploy

คู่มือนี้สำหรับติดตั้ง production ด้วย Docker เท่านั้น

## 1. เข้าโฟลเดอร์โปรเจกต์

```bash
git clone https://github.com/tehnplk/SUB_HDC.git
cd SUB_HDC
```

## 2. สร้างไฟล์ .env

```bash
cp webapp/.env.example webapp/.env
```

สำหรับ production Docker ให้ค่า DB ใน `webapp/.env` เป็นแบบนี้เสมอ:

```env
DB_HOST=mariadb
DB_PORT=3306
DB_USER=root
DB_PASSWORD=112233
DB_DATABASE=sub_hdc
```

ห้ามเปลี่ยน DB เป็น `localhost` ตอน deploy ด้วย Docker

ให้แก้เฉพาะค่าที่เกี่ยวกับเว็บจริง:

```env
AUTH_URL=https://your-domain.example
AUTH_SECRET=change_this_to_a_strong_secret
AUTH_USERNAME=admin
AUTH_PASSWORD=change_this_password
CENTER_NAME=ชื่อหน่วยงาน
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

`AUTH_URL` ให้ใส่ URL จริงที่ผู้ใช้เปิดเว็บ เช่น:

```env
AUTH_URL=https://your-domain.example
```

หรือถ้าใช้เฉพาะ IP ภายใน:

```env
AUTH_URL=http://192.168.1.10
```

## 3. Deploy ใหม่ทั้งหมด

```bash
docker compose down -v
docker compose up -d --build
```

คำสั่งนี้จะสร้าง database ใหม่จากไฟล์ `table/*.sql`

## 4. ตรวจสถานะ

ต้องรันคำสั่งจากโฟลเดอร์โปรเจกต์ `SUB_HDC`

```bash
docker compose ps
docker compose logs -f webapp
```

## URL หลัง deploy

- Web: URL ที่ตั้งใน `AUTH_URL`
- MariaDB ภายใน Docker: `mariadb:3306`
- MariaDB จากนอก Docker: `SERVER_IP:3308`

## Update app ครั้งต่อไป

```bash
cd SUB_HDC
git pull
docker compose up -d --build webapp
```

## จำง่าย ๆ

- คำสั่ง `docker compose ...` ต้องรันในโฟลเดอร์โปรเจกต์ `SUB_HDC`
- Production Docker ใช้ `DB_HOST=mariadb`
- Production Docker ใช้ `DB_PORT=3306`
- ไม่ต้องใช้ `--env-file`
- ไม่ต้องแก้ `docker-compose.yml`
