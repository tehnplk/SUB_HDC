# API Endpoints

Base URL (production): `https://subhdc.plkhealth.go.th`

ทั้งสอง endpoint เป็น **public** (ไม่ต้องมี token/auth) รองรับ CORS ทุก origin
ส่ง body เป็น JSON พร้อม header `Content-Type: application/json`

---

## 1. `/api/data-sync-in` — รับข้อมูล sync จากหน่วยบริการ

### POST

เก็บ JSON ทั้งก้อนลงคอลัมน์ `payload` ของตาราง `data_sync_in`
ถ้ามี field `sub_center_name` จะถูกแยกเก็บลงคอลัมน์ต่างหากเพื่อให้ query ง่าย

**Body:**

```json
{
  "sub_center_name": "รพ.สต.บ้านคลอง",
  "hospcode": "10731",
  "data_type": "person",
  "rows": [
    { "cid": "3100500123456", "name": "สมชาย ใจดี" },
    { "cid": "3650100654321", "name": "สมหญิง มีสุข" }
  ]
}
```

**ตัวอย่าง curl:**

```bash
curl -X POST https://subhdc.plkhealth.go.th/api/data-sync-in \
  -H "Content-Type: application/json" \
  -d '{"sub_center_name":"รพ.สต.บ้านคลอง","hospcode":"10731","data_type":"person","rows":[{"cid":"3100500123456","name":"สมชาย ใจดี"}]}'
```

**Response `201`:**

```json
{ "success": true, "id": 1, "date_time_sync": "2026-07-06T03:10:00.000Z" }
```

**กติกา:**

| เงื่อนไข | ผลลัพธ์ |
|---|---|
| body ไม่ใช่ JSON ที่ถูกต้อง | `400` `{"success":false,"error":"Invalid JSON body"}` |
| body ไม่ใช่ object/array | `400` `{"success":false,"error":"JSON body must be an object or array"}` |
| body ใหญ่เกิน 5MB | `413` `{"success":false,"error":"Payload too large (max 5MB)"}` |
| `sub_center_name` ยาวเกิน 255 ตัวอักษร | ถูกตัดให้เหลือ 255 |
| field อื่น ๆ | ใส่อะไรมาก็ได้ เก็บลง `payload` ทั้งก้อน |

> endpoint นี้**ไม่มี GET** — เรียก GET จะได้ `405 Method Not Allowed`

---

## 2. `/api/sub-version` — บันทึก/อ่านเวอร์ชันระบบ

### POST

เพิ่ม record ลงตาราง `sub_version`

**Body:**

```json
{
  "version": "1.0.2",
  "issue": "แก้บั๊กหน้า benchmark และเพิ่มคอลัมน์ sub_center_name"
}
```

| field | บังคับ | รายละเอียด |
|---|---|---|
| `version` | ✅ | string ไม่เกิน 50 ตัวอักษร (เกินถูกตัด) — ไม่ส่ง/ว่าง ตอบ `400` |
| `issue` | ❌ | string ยาวเท่าไหร่ก็ได้ ไม่ส่งจะเก็บเป็น NULL |

**ตัวอย่าง curl:**

```bash
curl -X POST https://subhdc.plkhealth.go.th/api/sub-version \
  -H "Content-Type: application/json" \
  -d '{"version":"1.0.2","issue":"แก้บั๊กหน้า benchmark"}'
```

**Response `201`:**

```json
{
  "success": true,
  "id": 1,
  "version": "1.0.2",
  "issue": "แก้บั๊กหน้า benchmark",
  "date_time": "2026-07-06T03:15:00.000Z"
}
```

### GET

คืนทุก record เรียงใหม่สุดก่อน (ไม่ต้องมี body)

```bash
curl https://subhdc.plkhealth.go.th/api/sub-version
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "version": "1.0.2", "issue": "แก้บั๊กหน้า benchmark", "date_time": "2026-07-06T03:15:00.000Z" }
  ]
}
```

---

## หมายเหตุ

- `id` และเวลา (`date_time_sync` / `date_time`) ระบบใส่ให้อัตโนมัติ ไม่ต้องส่งมา
- ทุก error ตอบเป็น JSON รูปแบบ `{"success":false,"error":"..."}`
- database error ตอบ `500`
