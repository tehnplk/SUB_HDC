# Import System Issues (2026-07-05)

## Summary
Import queue มี 3 ปัญหาหลักที่ทำให้ ZIP files ค้างอยู่ใน queue ไม่ถูกนำเข้า

---

## Issue 1: Stuck `processing` Records Block Queue

**Symptoms:**
- `log_import_file` มี 3 records ที่ status `processing` ค้าง โดยไม่มี `finish_date_time`
- Queue มี `IMPORT_QUEUE_CONCURRENCY=2` ทำให้ import ใหม่ติดคิว

**Affected records (id 7, 8, 9):**

| id | file | import_date_time |
|----|------|-----------------|
| 7 | F43_11251_20260501163102.zip | 2026-07-05 22:40:43 |
| 8 | F43_11251_20260501163101.zip | 2026-07-05 22:40:44 |
| 9 | F43_11252_20260401130056.zip | 2026-07-05 22:51:03 |

**Root Cause:**
Import process ตายกลางทาง (connection loss, container restart, etc.) แต่ไม่ได้อัปเดต status ใน `finally` block

---

## Issue 2: MySQL Connection Closed Mid-Import

**Error:** `Can't add new command when connection is in closed state`

**Affected imports:**

| id | file | error |
|----|------|-------|
| 10 | F43_14056_20260601110955.zip | connection closed |
| 13 | F43_11251_20260501163101.zip | connection closed |

**Likely Causes:**
1. `LOAD DATA LOCAL INFILE` ใช้ connection ละ 1 query — เมื่อ connection pool หมดอายุ หรือ idle timeout ถูกตัดกลาง import
2. `wait_timeout` / `interactive_timeout` ของ MariaDB default อาจสั้นเกิน
3. Connection pool ใน app ไม่ได้จัดการ reconnection

---

## Issue 3: Lock Timeout on Large Tables

**Error:** `charge_opd: timed out waiting for import lock`

**Affected import:**
- id 6: F43_11252 (charge_opd 55,977 rows)

**Root Cause:**
- `REPLACE INTO` / `LOAD DATA` บนตารางใหญ่ (charge_opd > 120K existing rows) ต้องการ table-level lock นาน
- Import พร้อมกัน 2 ไฟล์แย่ง lock กัน → ตัวนึง timeout
- MariaDB `lock_wait_timeout` default = 86400s (แต่ user-level lock `GET_LOCK` มี timeout สั้นกว่า)

---

## Recommendations

1. **Fix stuck records:** กวาด `log_import_file` ที่ `processing` + ไม่มี `finish_date_time` → ตั้งเป็น `not_complate` หรือมี cron cleanup
2. **Connection resilience:** 
   - เพิ่ม `wait_timeout=86400` ใน `my.cnf`
   - หรือให้ app ใช้ `pool.getConnection()` + `connection.ping()` ก่อนเริ่ม import แต่ละตาราง
3. **Import isolation:**
   - `IMPORT_QUEUE_CONCURRENCY=1` เพื่อเลี่ยง lock contention
   - หรือ lock ทั้งไฟล์ก่อนเริ่ม import (GET_LOCK per file instead of per table)
4. **Recovery mechanism:** import ควรมี `try/finally` ที่อัปเดต status เสมอ แม้ process จะ crash

---

## Current State (2026-07-05 16:10 ICT)

| Status | Count |
|--------|-------|
| complete | 7 |
| processing (ค้าง) | 3 |
| not_complate | 3 |

Files รอใน `tmp/uploads/`:
- `F43_11251_20260501163101.zip` (5.2M)
- `F43_11252_20260401130056.zip` (8.0M)
