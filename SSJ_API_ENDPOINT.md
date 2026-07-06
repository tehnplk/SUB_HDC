# API Endpoints

Base URL (production): `https://subhdc.plkhealth.go.th`

ทั้งสอง endpoint เป็น **public** (ไม่ต้องมี token/auth) รองรับ CORS ทุก origin
ส่ง body เป็น JSON พร้อม header `Content-Type: application/json`

---

## 1. `/api/data-sync-in` — รับข้อมูล sync จากหน่วยบริการ

### POST

เก็บ JSON ทั้งก้อนลงคอลัมน์ `payload` ของตาราง `data_sync_in`
ถ้ามี field `sub_center_name` (ชื่ออำเภอของ sub center ที่ส่งข้อมูล) และ `topic` จะถูกแยกเก็บลงคอลัมน์ต่างหากเพื่อให้ query ง่าย
ส่วน `rows` ส่วนใหญ่เป็นข้อมูล **summary รายหน่วยบริการในอำเภอ**

> **Sync แบบ replace:** คู่ `sub_center_name` + `topic` เป็น unique — ถ้าอำเภอเดิมส่ง topic เดิมซ้ำ
> ระบบจะ**แทนที่** `payload` และอัปเดต `date_time_sync` ของแถวเดิม (ไม่เพิ่มแถวใหม่)
> ดังนั้นแต่ละอำเภอจะมีข้อมูลล่าสุดเพียง 1 แถวต่อ 1 topic

**Body:**

```json
{
  "sub_center_name": "บางกระทุ่ม",
  "topic": "person",
  "rows": [
    { "hospcode": "06505", "hosname": "รพ.บางกระทุ่ม", "total": 12500, "sync_ok": 12400 },
    { "hospcode": "07021", "hosname": "รพ.สต.บ้านไร่", "total": 4300, "sync_ok": 4300 }
  ]
}
```

**ตัวอย่าง curl:**

```bash
curl -X POST https://subhdc.plkhealth.go.th/api/data-sync-in \
  -H "Content-Type: application/json" \
  -d '{"sub_center_name":"บางกระทุ่ม","topic":"person","rows":[{"hospcode":"06505","hosname":"รพ.บางกระทุ่ม","total":12500,"sync_ok":12400}]}'
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
| `sub_center_name` / `topic` ยาวเกิน 255 ตัวอักษร | ถูกตัดให้เหลือ 255 |
| field อื่น ๆ | ใส่อะไรมาก็ได้ เก็บลง `payload` ทั้งก้อน |

### GET

คืน 10 รายการ sync ล่าสุด (เรียงตาม `date_time_sync` ใหม่สุดก่อน ไม่ต้องมี body)
`date_time_sync` เป็น**เวลาไทย (+7)** รูปแบบ `YYYY-MM-DD HH:mm:ss`

```bash
curl https://subhdc.plkhealth.go.th/api/data-sync-in
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "sub_center_name": "บางกระทุ่ม",
      "topic": "person",
      "payload": {
        "sub_center_name": "บางกระทุ่ม",
        "topic": "person",
        "rows": [{ "hospcode": "06505", "hosname": "รพ.บางกระทุ่ม", "total": 12500, "sync_ok": 12400 }]
      },
      "date_time_sync": "2026-07-06 10:43:28"
    }
  ]
}
```

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
`date_time` เป็น**เวลาไทย (+7)** รูปแบบ `YYYY-MM-DD HH:mm:ss`

```bash
curl https://subhdc.plkhealth.go.th/api/sub-version
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "version": "1.0.2", "issue": "แก้บั๊กหน้า benchmark", "date_time": "2026-07-06 10:15:00" }
  ]
}
```

### PUT

แก้ไข record เดิมตาม `id` (ส่งเฉพาะ field ที่ต้องการแก้ — field ที่ไม่ส่งจะคงค่าเดิม)

**Body:**

```json
{
  "id": 1,
  "version": "1.0.3",
  "issue": "อัปเดตรายละเอียด issue"
}
```

| field | บังคับ | รายละเอียด |
|---|---|---|
| `id` | ✅ | เลข id ของ record ที่จะแก้ — ไม่พบตอบ `404` |
| `version` | ❌* | string ไม่เกิน 50 ตัวอักษร |
| `issue` | ❌* | string |

\* ต้องส่งอย่างน้อย 1 field (`version` หรือ `issue`) ไม่งั้นตอบ `400`

**ตัวอย่าง curl:**

```bash
curl -X PUT https://subhdc.plkhealth.go.th/api/sub-version \
  -H "Content-Type: application/json" \
  -d '{"id":1,"issue":"อัปเดตรายละเอียด issue"}'
```

**Response `200`:**

```json
{
  "success": true,
  "id": 1,
  "version": "1.0.2",
  "issue": "อัปเดตรายละเอียด issue",
  "date_time": "2026-07-06T03:15:00.000Z"
}
```

---

## หมายเหตุ

- `id` และเวลา (`date_time_sync` / `date_time`) ระบบใส่ให้อัตโนมัติ ไม่ต้องส่งมา
- ทุก error ตอบเป็น JSON รูปแบบ `{"success":false,"error":"..."}`
- database error ตอบ `500`
