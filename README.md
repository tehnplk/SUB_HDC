# SUB HDC Production Docker Deploy

คู่มือนี้สำหรับติดตั้งและอัปเดตระบบด้วย Docker Compose เท่านั้น

## 1. เข้าโฟลเดอร์โปรเจกต์

```bash
git clone https://github.com/tehnplk/SUB_HDC.git
cd SUB_HDC
```

## 2. สร้างไฟล์ .env

```bash
cp webapp/.env.example webapp/.env
```

ตั้งค่าใน `webapp/.env`

```env
# DATABASE
DB_HOST=host.docker.internal
DB_PORT=3308
DB_USER=root
DB_PASSWORD=112233
DB_DATABASE=sub_hdc

# SYS
ENCRYPT_KEY=your_encrypt_key_here
JWT_KEY=your_jwt_key_here
AUTH_SECRET=your_auth_secret_here
AUTH_TRUST_HOST=true
AUTH_USERNAME=admin
AUTH_PASSWORD=your_admin_password_here
CENTER_NAME=ชื่อศูนย์ข้อมูล

# AGENT
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## 3. ติดตั้งใหม่

```bash
docker compose up -d --build
```

คำสั่งนี้จะสร้าง database ใหม่จากไฟล์ `table/*.sql`

## 4. อัปเดตระบบ

```bash
cd SUB_HDC
git pull
docker compose up -d --build
```

คำสั่งนี้จะอัปเดตระบบโดยไม่ลบ database volume
