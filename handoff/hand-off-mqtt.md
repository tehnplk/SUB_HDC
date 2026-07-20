# MQTT Broker Handoff

Broker ตัวเดียวกับที่ใช้งานร่วมกันทุกแอปบน prod host — ทดสอบ pub/sub ผ่านแล้ว (2026-07-19) ทั้งจากใน server และจาก internet

## Broker

| รายการ | ค่า |
|---|---|
| Host | `61.19.112.242` (prod host เดียวกับ subhdc) |
| MQTT port | `1883` |
| WebSocket port | `9001` |
| TLS | ❌ ไม่มี — อย่าส่งข้อมูลลับผ่าน broker นี้ |
| Anonymous | ❌ ต้อง login ทุก connection |

## Credentials

| User | Password | หมายเหตุ |
|---|---|---|
| `subhdc` | `Subhdc@Mqtt2026` | สร้าง 2026-07-19 สำหรับโปรเจกต์นี้ |
| `hosplk` | (ไม่ทราบรหัส) | user เดิม มีมาก่อน |

## ตัวอย่างการใช้งาน

CLI (MQTT.js):

```bash
npx mqtt sub -h 61.19.112.242 -p 1883 -u subhdc -P 'Subhdc@Mqtt2026' -t 'test/subhdc'
npx mqtt pub -h 61.19.112.242 -p 1883 -u subhdc -P 'Subhdc@Mqtt2026' -t 'test/subhdc' -m 'hello'
```

Node.js (แอปฝั่ง server):

```js
import mqtt from "mqtt";

const client = mqtt.connect("mqtt://61.19.112.242:1883", {
  username: "subhdc",
  password: "Subhdc@Mqtt2026",
});
```

Browser (ผ่าน WebSocket):

```js
const client = mqtt.connect("ws://61.19.112.242:9001", {
  username: "subhdc",
  password: "Subhdc@Mqtt2026",
});
```

## โครงสร้างบน server

- รันเป็น docker container ชื่อ `mosquitto` (image `eclipse-mosquitto`) แบบ standalone `docker run` — ไม่มี docker-compose
- Mount จาก host: `/home/adminplk/mosquitto/{config,data,log}` → `/mosquitto/{config,data,log}`
- Config หลัก: `allow_anonymous false`, `password_file /mosquitto/config/password_file`, persistence เปิดอยู่
- SSH เข้า host: `adminplk@61.19.112.242 -p 2233` (ดู docs/deploy_prod.md)

## Admin: เพิ่ม/แก้ user

เพิ่ม user แล้ว reload โดยไม่ต้อง restart container (client เดิมไม่หลุด):

```bash
docker exec mosquitto mosquitto_passwd -b /mosquitto/config/password_file <user> '<pass>'
docker kill -s HUP mosquitto
```

ลบ user: `mosquitto_passwd -D /mosquitto/config/password_file <user>` แล้ว HUP เหมือนเดิม

## ข้อควรระวัง

1. `password_file` เป็น world-readable — mosquitto เตือนว่าเวอร์ชันหน้าจะไม่ยอมโหลด ถ้าจะแก้ต้อง `chown` ให้ user `mosquitto` ก่อนค่อย `chmod 0700` (chmod อย่างเดียวจะทำให้ broker อ่านไฟล์ไม่ได้เพราะไฟล์เป็นของ root)
2. Port 1883/9001 เปิดสู่ internet โดยตรง ไม่มี TLS — เหมาะกับข้อมูลทั่วไป/สัญญาณ event เท่านั้น
