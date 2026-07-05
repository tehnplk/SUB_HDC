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


ตั้งค่าในไฟล์ .env


```env
# DATABASE
DB_HOST=host.docker.internal
DB_PORT=3308
DB_USER=root
DB_PASSWORD=112233
DB_DATABASE=sub_hdc
```

```env
# SYS
ENCRYPT_KEY=your_encrypt_key_here
JWT_KEY=your_jwt_key_here
AUTH_SECRET=your_auth_secret_here
AUTH_TRUST_HOST=true
AUTH_USERNAME=admin
AUTH_PASSWORD=your_admin_password_here
CENTER_NAME=ชื่อศูนย์ข้อมูล
```

```env
# AGENT
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com

```

## 3. Deploy ใหม่ทั้งหมด

```bash
docker compose down -v
docker compose up -d --build
```

คำสั่งนี้จะสร้าง database ใหม่จากไฟล์ `table/*.sql`


## 4. การ UPDATE

### อัปเดตปกติ (โค้ด webapp / config.json)

```bash
cd SUB_HDC
git pull
docker compose up -d --build webapp
```

ค่า import settings (`import.method`, `import.queueConcurrency`, `import.queueCapacity`, `import.userMaxZips`, `import.staleMinutes`) อยู่ใน `webapp/config.json` ซึ่งถูก build เข้า image — แก้แล้วต้อง rebuild webapp ด้วยคำสั่งข้างบน

### กรณี `my.cnf` มีการแก้ไข

ต้อง recreate ตัว database container ด้วย เพราะ `my.cnf` เป็น single-file bind mount — หลัง `git pull` container เดิมจะยังเห็นไฟล์เก่า (restart เฉย ๆ ไม่พอ)

```bash
cd SUB_HDC
git pull
docker compose up -d --force-recreate mariadb
docker compose up -d --build webapp
```

ตรวจว่าค่าใหม่มีผลแล้ว:

```bash
docker exec sub_hdc_db mysql -uroot -p112233 -e "SHOW VARIABLES LIKE 'wait_timeout'"
```

> คำเตือน: recreate `mariadb` ทำให้ database หยุดชั่วคราวไม่กี่วินาที — อย่าทำระหว่างมี import กำลังรันอยู่ (เช็คหน้า `/dashboard/log-import` แท็บ "รอนำเข้า" ให้เป็น 0 ก่อน)