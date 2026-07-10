# Handoff — Cache หน้า /dashboard/hos-list

สถานะ ณ v1.1.7 · อัปเดต 2026-07-09 (review รอบสองแล้ว) · **โค้ดครบแล้ว ยังไม่ commit/deploy**

## Review ตาม requirement (2026-07-09 บ่าย) — ผ่านครบ 7 ข้อ + แก้ 4 จุด

ตรวจโค้ดเทียบ requirement ทุกข้อ **ผ่านครบ** และยืนยัน live บน local docker แล้ว
(สิ่งที่หัวข้อ "ทดสอบแล้ว" ด้านล่างบอกว่ายังไม่ได้ทำ — ตอนนี้ทำแล้ว):
14 keys = 7 แฟ้ม × 2 ปีงบ (2568/2569), TTL ตรง 24 ชม., รูปแบบข้อมูลตรงกับที่ route อ่าน

จุดที่แก้จาก review:

1. **`runSummarizeCycle` รับ `shouldAbort` เช็คก่อนทุกแฟ้ม** — เดิมเช็ค `isImporting`
   แค่ตอนเริ่มรอบ แต่รอบจริงที่ อ.เมือง ยาว 30-60 นาที import กลางรอบจะแย่ง disk
   ไปจนจบรอบ. ตอนนี้ abort กลางรอบทันที + daemon ไม่นับเป็นรอบสำเร็จ (poll 5 นาที
   กลับมาทำใหม่หลัง import จบ ไม่รอ 24 ชม.)
2. **ถอด `depends_on: redis` ออกจาก importer ใน compose** — importer ไม่ใช้ redis
   เลย ระบบนำเข้า (critical) ต้องไม่ถูก block เพราะ cache infra start ไม่ขึ้น
3. **`cacheSetJson` คืน boolean + `summarizeFile` นับเฉพาะเขียนสำเร็จ** — log
   "warmed" ไม่โกหกอีกต่อไป และตัวนับใหม่นี้**เปิดโปงบั๊กแฝงจริง**: daemon บูตแล้ว
   ยิง cache ทันทีขณะ client ยัง connect ไม่เสร็จ → write แรกโดน
   `enableOfflineQueue:false` โยนทิ้งเงียบ (เจอจริง: charge_opd warmed 1/2, keys=13)
4. **เพิ่ม `waitRedisReady()` ใน redis.mjs** — daemon รอ client ready ก่อนรอบแรก
   → cold boot warm ครบ 14/14 ยืนยัน live แล้ว (webapp route ไม่ใช้ helper นี้ —
   fail-fast สำคัญกว่า และ request แรกมาช้ากว่า connect เสมอ)
5. จิ๋ว: log `cycle error:` ว่างเปล่าเมื่อเป็น AggregateError (DB ยังไม่พร้อมตอน
   start) — ดึง detail จาก `error.errors` มา log แล้ว; แก้ typo comment

Limitation ที่บันทึกไว้ (ไม่แก้): cache-miss stampede — miss บน charge_opd ที่
อ.เมือง = นับสด 13 นาทีใน request path; mitigate ด้วย summarize-on-start แล้ว
โอกาสเกิดต่ำ. tests รวมทั้งชุด: **184 passed, 0 failed**

## เป้าหมาย

หน้า `/dashboard/hos-list` นับตัวเลขสดจากตารางล้านแถวทุกครั้งที่เปิด → ช้ามากบนแฟ้มใหญ่.
ทำ cache ด้วย **Redis** ให้ดูสรุปได้เร็ว (มีแผนใช้ Redis กับงานอื่นในอนาคตด้วย).

## ตัดสินใจแล้ว (จากการคุยกับผู้ใช้)

1. **ใช้ Redis** เป็น cache (ไม่ใช่ tmp_count_files / unstable_cache)
2. **แบบ A — summarize container นับล่วงหน้าเก็บ Redis** — หน้า hos-list อ่านจาก Redis ไม่ query ตารางใหญ่
3. **interval = ทุก 24 ชม.**
4. **เกณฑ์แฟ้มที่ cache = เจาะจงชื่อ (แบบ ข)** — ผู้ใช้ระบุรายชื่อเอง ไม่ใช้ threshold อัตโนมัติ
5. **แฟ้มที่ cache (7 แฟ้ม, ผู้ใช้ระบุ 2026-07-09):**
   `charge_opd`, `charge_ipd`, `diagnosis_opd`, `diagnosis_ipd`, `drug_opd`, `drug_ipd`, `labfu`
   — แฟ้มอื่น (service ฯลฯ) นับสดเสมอ (เล็กพอ นับเร็ว)
6. **TTL = 24 ชม.** (ตรงกับรอบ summarize)
7. **ไม่ invalidate ตอน import** — รอ summarize รอบถัดไป (importer ยัง `depends_on: redis` เผื่ออนาคต แต่ยังไม่เขียน invalidation)

## เสร็จแล้ว — โค้ดครบทั้งหมด (ยังไม่ commit บน branch `tehn/update`)

> ⚠️ ทั้งหมดเป็น **working change ยังไม่ commit / ยังไม่ deploy**

### Redis infra (มีมาก่อนหน้านี้)

- **docker-compose.yml**: service `redis` (redis:7-alpine)
  - `--maxmemory 128mb --maxmemory-policy allkeys-lru --appendonly yes --save ""`
  - volume `sub_hdc_redis_data`, healthcheck `redis-cli ping`
  - `webapp` + `importer` มี `depends_on: redis`
- **webapp/lib/redis.mjs**: client กลาง (ioredis) + helpers `getRedis / cacheGetJson / cacheSetJson / cacheDeletePattern`
  - URL hardcode `redis://redis:6379` (override ด้วย env `REDIS_URL`, ปิดด้วย `REDIS_DISABLED=1`)
  - graceful fallback: Redis ล่ม → คืน null (miss) → นับสดจาก DB, แอปไม่พัง
  - fail-fast: `commandTimeout 2s`, `enableOfflineQueue false`, `maxRetriesPerRequest 1`
- **package.json**: `ioredis ^5.11.1`

### Cache logic (ทำเสร็จรอบนี้ 2026-07-09)

- **webapp/lib/dashboard-cache.mjs** (ใหม่): นิยาม `CACHED_FILES` (7 แฟ้ม), `isCachedFile()`,
  `CACHE_TTL_SECONDS = 24*60*60`, `hosListCacheKey(file, fiscalYearLabel)` → `hos:<file>:<ปีงบพ.ศ.>`
- **webapp/lib/hos-list-query.mjs** (ใหม่): สกัด query helpers (`getTableColumns`, `getFiscalYears`,
  `getMonthlyRows`, `getTotalRows`) ออกจาก `route.js` → route + summarize ใช้ query ตัวเดียวกัน
  (cache ที่ summarize เขียน กับที่ route อ่าน มาจาก query เดียวกันเป๊ะ ไม่หลุด sync)
- **webapp/app/api/dashboard/route.js**: import query helpers จาก lib ใหม่. ในสาขา `hasMonthly`
  ถ้า `isCachedFile(selectedFile)` → ลอง `cacheGetJson` ก่อน, **miss → นับสด + `cacheSetJson`
  (write-back self-heal)**. แฟ้มอื่นนับสดตรงเหมือนเดิม
- **webapp/lib/summarize.mjs** (ใหม่): logic นับล่วงหน้า
  - `fiscalYearsToWarm()` = ปีงบปัจจุบัน + ย้อนหลัง 1 (yearsBack=1)
  - `summarizeFile(conn, file, fiscalYearAds)` — นับ+เขียน cache รายแฟ้ม
  - `runSummarizeCycle(conn, {files, fiscalYearAds, logger})` — วนทุกแฟ้ม × ปีงบ,
    **error ราย file ไม่ล้มทั้งรอบ** (try/catch รายแฟ้ม), คืน `{files, keys, errors}`
- **webapp/lib/summarize_daemon.js** (ใหม่): loop
  - รันทันทีตอน start (กัน cold start) + วน `SUMMARIZE_INTERVAL_MS` (default 24 ชม.)
  - poll `SUMMARIZE_POLL_MS` (default 5 นาที) เพื่อลองใหม่เร็วขึ้นถ้ารอบก่อนโดนข้าม
  - **ข้ามรอบถ้า `isImporting(conn)`** (ไม่แย่ง disk I/O กับ LOAD DATA)
  - **guard `cycleRunning`** กันรอบซ้อน (รอบก่อนยังไม่จบ → ข้าม)
  - SIGTERM/SIGINT graceful shutdown
- **docker-compose.yml**: เพิ่ม service `summarize` (`sub_hdc_summarize`)
  - `image: sub-hdc-webapp` (ใช้ image เดียวกับ webapp/importer), `command: node lib/summarize_daemon.js`
  - `depends_on: mariadb (healthy) + redis (healthy)`, env_file `./webapp/.env`

### สำคัญ: `datePrefixExpression` แก้ให้ตัด LEFT แบบมีเงื่อนไข

`webapp/lib/dashboard-data.mjs` → `datePrefixExpression(col)`:
- **column varchar(8) สะอาด** (`date_serv`, `date_admit`, `bdate`) → คืนชื่อคอลัมน์ตรงๆ (ไม่มี LEFT)
  → ใช้ index ได้ ไม่ full scan
- **column datetime varchar(100)** (`datetime_admit`, `datetime_serv`) → **คง `LEFT(col, 8)`**
  เพราะมีเวลาต่อท้าย ต้องตัดเอาเฉพาะ 8 หลักวันที่

> **ชนิด date column จริงบน อ.เมือง (ยืนยันแล้ว):**
> | แฟ้ม | date column | ชนิด | LEFT? |
> |---|---|---|---|
> | charge_opd | date_serv | varchar(8) | ไม่มี |
> | diagnosis_opd | date_serv | varchar(8) | ไม่มี |
> | drug_opd | date_serv | varchar(8) | ไม่มี |
> | labfu | date_serv | varchar(8) | ไม่มี |
> | charge_ipd | **datetime_admit** | **varchar(100)** | **มี LEFT(,8)** |
> | diagnosis_ipd | **datetime_admit** | **varchar(100)** | **มี LEFT(,8)** |
> | drug_ipd | **datetime_admit** | **varchar(100)** | **มี LEFT(,8)** |

### tests

- `webapp/tests/dashboard-cache.test.mjs` (ใหม่): CACHED_FILES ตรง 7 แฟ้ม, isCachedFile, key shape, TTL
- `webapp/tests/summarize.test.mjs` (ใหม่): fiscalYearsToWarm, runSummarizeCycle วนครบ,
  error isolation, compose มี service summarize
- `webapp/tests/dashboard-data.test.mjs` (แก้): เพิ่ม assert ว่า date_serv/date_admit/bdate ไม่มี LEFT,
  datetime_* ยังมี LEFT
- **รันชุดเต็ม: 173 pass, 0 fail** (`node --test tests/*.test.mjs`)

## ข้อมูลจริงที่วัดได้ (production อ.เมือง, buffer pool 1200M)

| แฟ้ม | จำนวนแถว | นับสด (GROUP BY) |
|---|---|---|
| **service** | 1.0M | **0.54 วิ** ← เร็ว ไม่ต้อง cache |
| charge_opd | 6.6M | **798 วิ = 13.3 นาที** ← ช้ามาก |
| labfu | 3.0M | ใหญ่ (cache) |
| diagnosis_opd | 2.2M | ใหญ่ (cache) |
| charge_ipd | 1.9M | ใหญ่ (cache) |
| drug_opd | 1.7M | ใหญ่ (cache) |
| diagnosis_ipd | — | ใหญ่ (cache) |
| drug_ipd | — | ใหญ่ (cache) |

**Insight**: service 1M นับสด 0.54 วิ แต่ charge_opd 6.6M ใช้ 798 วิ — ต่างกัน ~1,500 เท่า
เพราะ buffer pool cache service ไว้หมด แต่ charge_opd ใหญ่เกิน ต้องอ่าน disk ทีละแถว.
จึง cache เฉพาะแฟ้มใหญ่หลายล้านแถว. แฟ้ม ≤ 1M นับสดได้สบาย.

## ทดสอบแล้ว

- query shape ใหม่ (no-LEFT `date_serv`) รันบน `service` production → ได้ผลถูกต้อง (monthly count ต่อ hospcode)
- node test suite 173 pass, 0 fail
- syntax check ทุกไฟล์ผ่าน
- **ยังไม่ได้** ทดสอบ round-trip cache กับ Redis จริงบนเครื่อง (docker local ไม่ได้รันตอนทำ)
  → ต้องยืนยันตอน deploy: เปิดหน้า charge_opd ครั้งแรก (miss นับสด+เขียน), ครั้งสองต้องเร็ว (hit)

## แผนที่เหลือ (ยังไม่ทำ — รอผู้ใช้สั่ง)

1. **commit** (ยังไม่ทำตามกฎ AGENTS.md)
2. **bump version** + post ไป center (`/api/sub-version`) — ดู [[version-bump-rule]]
3. **deploy อ.เมือง** — ดู [[deploy-mueang]]:
   - Redis + summarize เป็น container ใหม่ → ครั้งแรกต้อง `docker compose up -d redis summarize`
   - summarize scan charge_opd ~13 นาที/รอบ วันละครั้ง = โหลดต่ำ
   - **ระวัง**: build webapp image แยกก่อน (`docker compose build webapp`) แล้วค่อย
     `up -d --no-build` เพราะ RAM 4GB `up --build` รวดเดียวเคยทำ OOM reboot
   - summarize/importer ใช้ image เดียวกัน → build webapp ให้สำเร็จก่อน
   - หลัง deploy: ยืนยัน importer ไม่ restart, และเปิด hos-list charge_opd ครั้งแรก→นับสด, ครั้งสอง→เร็ว

## ไฟล์อ้างอิง

- `webapp/lib/dashboard-cache.mjs` — CACHED_FILES / TTL / key
- `webapp/lib/hos-list-query.mjs` — query helpers ที่ route + summarize ใช้ร่วม
- `webapp/lib/summarize.mjs` — logic รอบ summarize
- `webapp/lib/summarize_daemon.js` — daemon loop
- `webapp/app/api/dashboard/route.js` — จุดอ่าน cache (สาขา hasMonthly)
- `webapp/lib/dashboard-data.mjs` — datePrefixExpression (LEFT แบบมีเงื่อนไข), MONTHS
- `webapp/lib/import-status.mjs` — isImporting() (ใช้ข้ามรอบตอน import)
- `webapp/lib/redis.mjs` — cache helpers
- artifact research 3 แนวทาง: https://claude.ai/code/artifact/6e24f12f-644e-4e05-8a59-f53d4daa1367
