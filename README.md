# SUB HDC

ระบบนำเข้าและตรวจสอบข้อมูล F43 ZIP

## สิ่งที่ต้องติดตั้ง
1. Docker Desktop
2. Git

## ขั้นตอนการติดตั้ง
1. Clone repository:
   ```bash
   git clone https://github.com/tehnplk/SUB_HDC.git
   cd SUB_HDC
   ```

2. สร้างไฟล์คอนฟิก `.env`:
   - คัดลอก `webapp/.env.example` ไปเป็น `webapp/.env`
   - แก้ไขคีย์และรหัสผ่านในไฟล์

3. รันระบบ:
   ```bash
   docker compose up -d
   ```

## พอร์ตที่ใช้งาน
- Web UI: http://localhost (พอร์ต 80)
- Database: localhost:3308 (พอร์ต 3308)

## การตั้งค่าสิทธิ์เข้าถึง (สำหรับ Linux เท่านั้น)
หากพบปัญหาในการเขียนไฟล์หรือฐานข้อมูลไม่เริ่มทำงาน ให้รันคำสั่งกำหนดสิทธิ์โฟลเดอร์:
```bash
chmod -R 777 webapp/tmp mysql_data
```

## วิธีการอัปเดตระบบ
```bash
git pull
docker compose up -d --build webapp
```

