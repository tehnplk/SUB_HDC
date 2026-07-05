# Import System Issues (2026-07-05)

> **สถานะ: แก้ไขแล้ว (2026-07-05)** — ดูรายละเอียดที่หัวข้อ [Fixes Applied](#fixes-applied-2026-07-05) ด้านล่าง

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

---

## Fixes Applied (2026-07-05)

### Issue 1 — Stuck `processing` records ✅
- `webapp/lib/log-import.mjs`: เพิ่ม `finalizeInterruptedLogImport()` (ปิด record เดี่ยวเมื่อ import process ตาย) และ `recoverStaleLogImports()` (กวาด record ที่ค้าง `pending`/`processing` เกิน `IMPORT_STALE_MINUTES` นาที ตั้งเป็น `not_complate`) — guard ด้วย `finish_date_time IS NULL` จะไม่ทับ record ที่ importer ปิดเองแล้ว
- `webapp/app/api/import-zip/route.js`: เมื่อ child process ตาย (exit code ≠ 0 หรือ spawn error) parent จะอัปเดต status เป็น `not_complate` ให้เอง + ทุกครั้งที่มี import ใหม่จะ sweep stale records อัตโนมัติ (fire-and-forget)
- `tmp_scripts/tmp_fix_stuck_processing.sql`: SQL สำหรับกวาดข้อมูลค้างด้วยมือ (one-off)
- Env ใหม่: `IMPORT_STALE_MINUTES` (default 120)

### Issue 2 — MySQL connection closed mid-import ✅
- `webapp/lib/import_f43_node.js`: pool เพิ่ม `enableKeepAlive` + `idleTimeout: 60s` (คืน connection ที่ idle ก่อนโดน server ตัด) และเพิ่ม `getPooledConnection()` ที่ `ping()` ตรวจ connection ก่อนใช้ทุกครั้ง — ถ้าตายจะ destroy แล้วดึงตัวใหม่ (retry 3 ครั้ง) ใช้แทน `pool.getConnection()` ทุกจุด
- `my.cnf`: เพิ่ม `wait_timeout=86400`, `interactive_timeout=86400`, `net_read_timeout=600`, `net_write_timeout=600` (ต้อง restart MariaDB container ให้มีผล)
- Error path ตอนบันทึก `not_complate` มี try/catch แยก — ถ้า pool พังจะไม่ mask error เดิม (parent/sweep จะปิด record ให้)

### Issue 3 — Lock timeout on large tables ✅
- `IMPORT_QUEUE_CONCURRENCY` เปลี่ยน default จาก 2 → 1 (ทั้งใน `import-queue.mjs`, `.env`, `.env.example`) — import ทีละไฟล์ ไม่แย่ง per-table advisory lock กัน
- ยังปรับ `IMPORT_ADVISORY_LOCK_TIMEOUT` (default 300s) ได้ผ่าน env เดิมหากตารางใหญ่ขึ้น

### Verification
- Test suite ทั้งหมดผ่าน: 126/126 (`node --test "tests/*.test.mjs"`)
- ตรวจ DB จริง (2026-07-05 16:24): ไม่มี record ค้าง `pending`/`processing` แล้ว
