# HDC Open Data API Guide

เอกสารนี้อธิบายขั้นตอนดึงรายงานจาก HDC Open Data API สำหรับนักพัฒนา ตั้งแต่ค้นหาหมวดรายงานจนถึงดึงข้อมูลรายงานจริง

Base URL:

```text
https://opendata.moph.go.th/api
```

Official Swagger UI:

```text
https://opendata.moph.go.th/api/document/
```

Live verification date: `2026-07-15`

ลำดับการใช้งาน:

1. ดึงหมวดรายงานเพื่อหา `cat_id`
2. ดึงชื่อรายงานและ `source_table`
3. ดึง schema ด้วย `source_table`
4. ดึงข้อมูลรายงานด้วย `source_table`, ปีงบประมาณ และรหัสจังหวัด

> ตัวอย่าง response ในเอกสารนี้แสดงเพียง 1 result object เท่านั้น ไม่ใช่ผลลัพธ์ทั้งหมดจาก endpoint
>
> ตัวอย่าง `curl` ใช้ syntax ของ Bash/macOS/Linux สำหรับ Windows PowerShell ให้ใช้ตัวอย่าง end-to-end ในหัวข้อท้ายเอกสาร

## 1. ดึง Report Category

- Method: `GET`
- Endpoint: `/category`
- Full URL: `https://opendata.moph.go.th/api/category`
- Params: ไม่มี
- Success status: `200 OK`
- Response shape: JSON array ของ category objects

```bash
curl -X GET \
  'https://opendata.moph.go.th/api/category' \
  -H 'accept: application/json'
```

ตัวอย่าง response 1 object:

```json
[
  {
    "cat_id": "cf7d9da207c0f9a7ee6c4fe3f09f67dd",
    "category_name": "การเฝ้าระวัง",
    "report_total": "12",
    "cat_icon": "fa fa-table"
  }
]
```

นำ `cat_id` ไปใช้กับ endpoint `/report/{cat_id}` ในขั้นตอนถัดไป

## 2. ดึง Report Name

มี 2 วิธีตามข้อมูลที่มีอยู่

### 2.1 ดึงรายงานทั้งหมดใน Category

- Method: `GET`
- Endpoint: `/report/{cat_id}`
- Success status: `200 OK`
- Response shape: JSON array ของ report objects
- Path param:
  - `cat_id` — รหัสหมวดจาก `/category`

```bash
curl -X GET \
  'https://opendata.moph.go.th/api/report/cf7d9da207c0f9a7ee6c4fe3f09f67dd' \
  -H 'accept: application/json'
```

ตัวอย่าง response 1 object:

```json
[
  {
    "report_id": 143,
    "report_name": "ร้อยละผู้ป่วยโรคเบาหวานที่ควบคุมระดับน้ำตาลได้ดี",
    "cat_id": "cf7d9da207c0f9a7ee6c4fe3f09f67dd",
    "source_table": "s_dm_control",
    "main_report_id": "73daf277928bc32a1b3c8e772192543c",
    "category_name": "การเฝ้าระวัง",
    "main_report_name": "ส่งเสริมป้องกัน",
    "id": "137a726340e4dfde7bbbc5d8aeee3ac3"
  }
]
```

ค่า `source_table` เป็นค่าหลักที่ต้องใช้ดึง schema และ report data

### 2.2 ค้นชื่อรายงานจาก Source Table โดยตรง

- Method: `GET`
- Endpoint: `/report_name/{source_table}`
- Success status: `200 OK`
- Response shape: JSON object `{ data: [...], total: "N" }`
- Path param:
  - `source_table` — ชื่อตารางรายงาน เช่น `s_dm_control`

```bash
curl -X GET \
  'https://opendata.moph.go.th/api/report_name/s_dm_control' \
  -H 'accept: application/json'
```

ตัวอย่าง response ที่ย่อเหลือ 1 object:

```json
{
  "data": [
    {
      "report_id": 143,
      "report_name": "ร้อยละผู้ป่วยโรคเบาหวานที่ควบคุมระดับน้ำตาลได้ดี",
      "source_table": "s_dm_control",
      "category_name": "การเฝ้าระวัง",
      "main_report_name": "ส่งเสริมป้องกัน"
    }
  ],
  "total": "3"
}
```

ข้อควรระวัง:

- endpoint นี้ค้นหาแบบใกล้เคียงและอาจคืนหลายรายการ เช่น เมื่อค้น `s_dm_control` อาจพบ `s_dm_control_monk`
- ต้อง filter `data[]` ด้วย `source_table === requestedSourceTable` แบบ exact match ห้ามใช้ object แรกโดยอัตโนมัติ
- ถ้า exact match เป็น 0 รายการ ให้ถือว่าไม่พบรายงาน ถ้ามากกว่า 1 รายการ ให้เลือกต่อด้วย `report_id` หรือ `cat_id` ตามบริบท
- `/report_name/{source_table}` ใช้งานได้จริง แต่ไม่ได้ประกาศใน Swagger ปัจจุบัน หาก endpoint นี้เปลี่ยน ให้ใช้ flow หลัก `/category` → `/report/{cat_id}` แทน

## 3. ดึง Report Schema

- Method: `GET`
- Endpoint: `/report_schema/{source_table}`
- Success status: `200 OK`
- Response shape: JSON array ของ column objects
- Path param:
  - `source_table` — ค่าที่ได้จากข้อมูลรายงาน เช่น `s_dm_control`

```bash
curl -X GET \
  'https://opendata.moph.go.th/api/report_schema/s_dm_control' \
  -H 'accept: application/json'
```

ตัวอย่าง response ที่แสดงเพียง 1 column object:

```json
[
  {
    "COLUMN_NAME": "target",
    "IS_NULLABLE": "YES",
    "COLUMN_TYPE": "int(11)",
    "COLUMN_COMMENT": "จำนวนผู้ป่วย ที่อยู่ในเขตรับผิดชอบ Typearea 1,3"
  }
]
```

ความหมาย field:

- `COLUMN_NAME` — ชื่อ field ที่จะพบใน report data
- `COLUMN_TYPE` — ชนิดข้อมูล
- `IS_NULLABLE` — อนุญาตให้เป็น `null` หรือไม่
- `COLUMN_COMMENT` — คำอธิบาย field จาก HDC

ควรตรวจทั้ง schema และข้อมูลจริงก่อนกำหนดความหมายเชิงธุรกิจ เพราะบางรายงานอาจมี `COLUMN_COMMENT` ที่ไม่สอดคล้องกับค่าจริง

## 4. ดึง Report Data

- Method: `POST`
- Endpoint: `/report_data`
- Full URL: `https://opendata.moph.go.th/api/report_data`
- Header: `Content-Type: application/json`
- Success status: `201 Created`
- Response shape:
  - `type: "json"` — JSON array ของ data row objects
  - `type: "csv"` — raw CSV text; API ปัจจุบันส่ง `Content-Type: text/html` และไม่มีชื่อไฟล์ จึงต้องบันทึก response เป็น `.csv` เอง

JSON body params:

| Param | Type | Required | Description |
|---|---|---:|---|
| `tableName` | string | Yes | `source_table` ของรายงาน เช่น `s_dm_control` |
| `year` | number | Yes | ปีงบประมาณ พ.ศ. ตั้งแต่ `2560` เป็นต้นไป เช่น `2569` |
| `province` | number | Yes | รหัสจังหวัด 2 หลัก เช่น `65` |
| `type` | string | Yes | รูปแบบผลลัพธ์: `json` หรือ `csv` |

```bash
curl -X POST \
  'https://opendata.moph.go.th/api/report_data' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "tableName": "s_dm_control",
    "year": 2569,
    "province": 65,
    "type": "json"
  }'
```

ตัวอย่าง response 1 object โดยย่อ:

```json
[
  {
    "id": "137a726340e4dfde7bbbc5d8aeee3ac3",
    "hospcode": "07478",
    "areacode": "65010307",
    "date_com": "202607120729",
    "b_year": "2569",
    "target": 222,
    "result": 91,
    "hba1c": 161
  }
]
```

ข้อควรระวัง:

- API คืนข้อมูลหลายแถวต่อ `hospcode` ได้ เพราะแยกตาม `areacode` จึงต้องรวมค่าตาม grain ที่รายงานต้องการ
- ถ้าต้องการหน่วยบริการเฉพาะแห่ง ให้ filter `hospcode` หลังจากรับ response
- endpoint ไม่มี `hospcode` request param และคืนข้อมูลระดับจังหวัดทั้งหมด จึงควรตั้ง timeout ให้เหมาะสมและอย่าคาดว่าจะได้เพียง 1 แถว
- อย่าบวก `target` กับ `target1` รวมกัน เพราะเป็นคนละกลุ่มประชากรตามนิยาม schema
- ควรใช้ `type: "json"` สำหรับงานประมวลผลในระบบ และใช้ `csv` เมื่อต้องการ raw CSV text
- ตรวจ HTTP status ก่อน parse response เสมอ: GET สำเร็จเป็น `200`, POST `/report_data` สำเร็จเป็น `201`

ตัวอย่างบันทึก CSV ใน Bash:

```bash
curl -X POST \
  'https://opendata.moph.go.th/api/report_data' \
  -H 'Content-Type: application/json' \
  -d '{"tableName":"s_dm_control","year":2569,"province":65,"type":"csv"}' \
  --output s_dm_control_2569_65.csv
```

## 5. PowerShell End-to-End Example

ตัวอย่างนี้ค้นรายงานแบบ exact match ดึง schema และดึงข้อมูล โดยไม่พิมพ์ response ทั้งหมดออกหน้าจอ

```powershell
$ErrorActionPreference = "Stop"
$baseUrl = "https://opendata.moph.go.th/api"
$requestedSourceTable = "s_dm_control"

# 1) Category
$categories = Invoke-RestMethod -Method Get -Uri "$baseUrl/category"
$category = $categories |
  Where-Object { $_.category_name -eq "การเฝ้าระวัง" } |
  Select-Object -First 1
if (-not $category) { throw "Category not found" }

# 2) Report name + source_table จาก category (official flow)
$reports = Invoke-RestMethod -Method Get -Uri "$baseUrl/report/$($category.cat_id)"
$reportMatches = @($reports | Where-Object {
  $_.source_table -eq $requestedSourceTable
})
if ($reportMatches.Count -eq 0) { throw "Report not found: $requestedSourceTable" }
if ($reportMatches.Count -gt 1) { throw "Multiple reports found; select by report_id" }
$report = $reportMatches[0]

# ทางเลือก: direct lookup แล้วบังคับ exact match
$search = Invoke-RestMethod -Method Get -Uri "$baseUrl/report_name/$requestedSourceTable"
$exactMatches = @($search.data | Where-Object {
  $_.source_table -eq $requestedSourceTable
})
if ($exactMatches.Count -eq 0) { throw "Exact report not found" }
if ($exactMatches.Count -gt 1) { throw "Multiple exact reports found; select by report_id" }

# 3) Schema
$schema = Invoke-RestMethod -Method Get `
  -Uri "$baseUrl/report_schema/$requestedSourceTable"

# 4) Report data
$body = @{
  tableName = $requestedSourceTable
  year = 2569
  province = 65
  type = "json"
} | ConvertTo-Json

$data = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/report_data" `
  -ContentType "application/json" `
  -Body $body

# ตัวอย่างเลือกหน่วยบริการ โดยไม่แสดงข้อมูลทั้งหมด
$hospitalRows = @($data | Where-Object { $_.hospcode -eq "07478" })
$hospitalRows | Select-Object -First 1
```

## Verification Checklist

ก่อนนำไปใช้ในระบบจริง ให้ตรวจครบทุกข้อ:

1. `cat_id` มาจาก `/category` ไม่ใช่ค่าที่เดาเอง
2. `source_table` มาจาก report metadata และตรงแบบ exact match
3. schema response เป็น array และมี `COLUMN_NAME` ที่โค้ดต้องใช้
4. POST body ใช้ตัวเลขสำหรับ `year` และ `province` ตาม Swagger
5. แยกการประมวลผล `json` กับ `csv` เพราะ response format ต่างกัน
6. ตรวจ grain ของข้อมูลก่อนรวมยอด โดยเฉพาะ `hospcode` + `areacode`
7. ไม่เชื่อ `COLUMN_COMMENT` เพียงอย่างเดียว ต้องตรวจค่าจริงและความสัมพันธ์ของ field

## Quick Reference

| Step | Method | Endpoint | Input หลัก |
|---|---|---|---|
| Category | `GET` | `/category` | ไม่มี |
| Reports by category | `GET` | `/report/{cat_id}` | `cat_id` |
| Report name by table | `GET` | `/report_name/{source_table}` | `source_table` |
| Report schema | `GET` | `/report_schema/{source_table}` | `source_table` |
| Report data | `POST` | `/report_data` | `tableName`, `year`, `province`, `type` |
