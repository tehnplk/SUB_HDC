# Handoff — Import Hang Incident & Prevention

อัปเดต 2026-07-09 · branch `tehn/update` · **โค้ดแก้ครบแล้ว ยังไม่ commit / build / deploy**

> ⚠️ ทั้งหมดเป็น **working change ยังไม่ commit / ยังไม่ deploy** (ตาม project rule: ไม่ build/deploy จนกว่าผู้ใช้สั่ง)

---

## เกิดอะไรขึ้น (อ.เมือง production)

Import job `330` (`F43_07492_20260401124215.zip`, hospcode 07492) **แขวน (hang) ~40 นาที** และ**ขวางคิวทั้งแถว** (12 job ตามหลังค้าง `pending` หมด)

### การวินิจฉัย (read-only ทั้งหมด)

ต่อ อ.เมือง ผ่าน `plink` SSH → `docker exec` (public IP `203.157.118.61:2233`, รหัสใน `DEPLOY_TO_อ.เมือง.md`):

| จุดที่ดู | สิ่งที่พบ | อ่านว่า |
|---|---|---|
| `SHOW PROCESSLIST` | proc 1648 ค้าง `Reading from net` รัน `LOAD DATA ... diagnosis_opd`, `Time` เดินแต่ไฟล์ไม่ขยับ | DB นั่งรอ data |
| `/proc/<pid>` + `ps -L` | worker `import_f43_node.js` ยังมีชีวิต: main thread `ep_poll`, worker threads `futex_wait_queue` | worker นั่งรอ I/O |
| `docker stats` | importer **0% CPU / 0 block-IO** | ไม่ได้ทำงาน = แขวน ไม่ใช่ช้า |
| `dmesg`, `uptime`, `free` | ไม่มี OOM, load ~0.1, RAM เหลือ | ไม่มีอะไรมาแย่ง resource |

### สาเหตุราก

**Half-open TCP** ระหว่าง importer ↔ DB (network สะดุดกลาง `LOAD DATA`) — ทั้งสองฝั่งรอกันเงียบ (importer ค้าง `ep_poll`, DB ค้าง `Reading from net`) ทั้งที่เครื่องว่าง

หมายเหตุจากการทบทวนรอบสอง: จริง ๆ my.cnf ตั้ง `net_read_timeout = 3600` ไว้ (ขยายเผื่อ LOAD ไฟล์ใหญ่ — 600 วิเคยตัด `chronicfu` 365k แถวที่ใช้ ~619 วิ) ดังนั้น server จะตัด hang เองที่ ~1 ชม. **แต่ไม่ช่วยอะไร**: (ก) คิวตันระหว่างรอ 1 ชม. (ข) พอตัดแล้ว daemon เดิมจะ finalize + **ลบ ZIP** = ข้อมูลหายอยู่ดี — จุดที่ต้องแก้จริงคือ daemon ต้องไม่ลบไฟล์ตอน interrupted

> เชื่อมโยง: เครื่อง อ.เมือง network แกว่ง (เคสเดียวกับ sync ที่ `fetch failed` — ดูหัวข้อล่างสุด)

---

## แก้เฉพาะหน้า (ทำไปแล้ว)

`docker restart sub_hdc_importer` → hang หลุด, คิวเดินต่อจนหมด (`complete=299`)

### ⚠️ ผลข้างเคียง: ข้อมูลตกหล่น

job 330 จบเป็น `not_complate` (`Import failed with exit code null`) และ ZIP ถูก **secure-delete ก่อนที่ recovery จะ re-queue ทัน** → ข้อมูล `F43_07492` **ไม่เข้า DB**

**ต้อง re-upload ไฟล์ `F43_07492` (hospcode 07492) ที่ อ.เมือง**

จุดนี้ยังเผยบั๊กจริง: `recoverProcessingZips()` ที่ควรย้าย ZIP จาก `processing/` กลับ `queue/` แข่ง `secureDelete` ใน `finally` ไม่ทัน → ไฟล์หายก่อนกู้

---

## แพตช์ป้องกัน (แก้ใน local repo แล้ว)

แก้ 3 defect แบบ defense-in-depth — import ที่แขวนจะไม่ทำข้อมูลหายเงียบหรือขวางคิวอีก

### ① LOAD DATA net timeout — `webapp/lib/import_f43_load_data.js`

`importFile` รัน `SET SESSION net_read_timeout / net_write_timeout` **ก่อน** `LOAD DATA`
- default **3600 วิ = เท่า my.cnf** (env `IMPORT_LOAD_NET_TIMEOUT`, หรือ `options.netTimeoutSeconds`)
- ⚠️ ห้ามตั้งต่ำกว่า 3600: ประวัติใน my.cnf บอกว่า 600 วิเคยตัด import `chronicfu` จริง (619 วิ บนเครื่อง disk-bound)
- บทบาท = **ประกัน config drift** (เพดานที่รู้ค่าแน่นอนไม่ว่า server config เป็นอะไร) — ตัวตัดหลักคือ watchdog ข้อ ②

### ② Watchdog kill worker ที่แขวน — `webapp/lib/import_daemon.js` (`runImportChild`)

`setTimeout` watchdog kill child ที่รันเกินเวลา
- default **2 ชม.** (env `IMPORT_CHILD_TIMEOUT_MS`) — ต้องยาวกว่า import จริงที่ช้าที่สุด (my.cnf เผื่อ `charge_opd` 2.4M แถวไว้ที่ read 3600 วิ) ไม่งั้นจะฆ่างานดี
- ใช้ `SIGKILL` (ไม่ใช่ SIGTERM) เพราะ process ที่ค้าง `ep_poll` อาจไม่ตอบ SIGTERM
- resolve เป็น interrupted (`code -1`)

### ③ ไม่ลบ ZIP ตอน interrupted — คืน queue แทน — `webapp/lib/import_daemon.js` (`processZip`)

จำแนกผลลัพธ์ (ละเอียดกว่าดู exit code เฉย ๆ):

| ผลลัพธ์ | ความหมาย | การจัดการ |
|---|---|---|
| `code 0` | สำเร็จ | secure-delete + ล้างตัวนับ retry |
| `code -1`, **`code null` / ตายเพราะ signal**, หรือ stderr เข้าลาย network error | interrupted / transient | **คืน ZIP กลับ `queue/` + reset log เป็น `pending`** → retry (LOAD DATA REPLACE รันซ้ำปลอดภัย) **ไม่ลบ** — สูงสุด `IMPORT_MAX_REQUEUES` (default 3) ครั้ง เกินแล้ว finalize พร้อมข้อความ "re-upload required" + ลบ |
| `code > 0` (ลาย error ข้อมูล) | fail จริง — retry ก็พังซ้ำ | `finalizeInterrupted` + delete (เหมือนเดิม) |

จุดสำคัญที่เพิ่มจากการ**ทบทวนรอบสอง** (อุดช่องที่แพตช์รอบแรกยังพลาด):

1. **`code null` = ตายเพราะ signal ต้องนับเป็น interrupted** — `docker restart` ส่ง SIGTERM → `close(code=null, signal)` ไม่ใช่ `-1` แพตช์รอบแรกจับแค่ `-1` จึงตกไป path ลบไฟล์ (**นี่แหละสาเหตุแท้ที่ข้อมูล job 330 หาย** — log บันทึก `Import failed with exit code null` ตรงเป๊ะ)
2. **แยก error เครือข่ายออกจาก error ข้อมูลด้วย stderr** (`isTransientImportFailure`) — worker exit 1 ทั้งสองกรณี ถ้าไม่แยก network ล่มชั่วคราวตอน connect ก็โดนลบไฟล์
3. **Retry cap ใน daemon (`IMPORT_MAX_REQUEUES`, in-memory)** — ที่แพตช์รอบแรกอ้างว่า "stale sweep เป็น safety net" นั้น**ผิด** 2 ชั้น: (ก) requeue reset `import_date_time` ทุกรอบ row เลยไม่มีวันแก่พอให้ sweep จับ (ข) คิวเป็น file-based — `pickReadyZip` อ่านโฟลเดอร์ ไม่เช็คสถานะ DB ต่อให้ sweep mark row ไฟล์ก็วนต่อ จึงต้อง cap ที่ daemon เอง
4. **แยก rename กับ DB update ตอน requeue** — ถ้า DB ล่มชั่วคราว (network เคสเดียวกัน) rename สำเร็จแล้วต้องไม่ตกไป path ลบไฟล์; row ที่ค้างจะถูก worker รอบ retry ตั้ง processing/complete ให้เอง

ฟังก์ชันใหม่ `requeueLogImport()`:
- `status='pending'`, `import_date_time=CURRENT_TIMESTAMP`, `finish_date_time=NULL`, `progress_percent=NULL`

หมายเหตุ: ZIP ที่ requeue จะถูกหยิบก่อนงานใหม่ (คิวเรียงตาม logImportId) — ยอมรับได้เพราะมี cap; และตัวนับ retry เป็น in-memory (daemon restart = นับใหม่ ซึ่งโอเคเพราะ restart เป็นการตัดสินใจของคน)

---

### ④ คิวเรียง "ไฟล์เล็กก่อน" (SJF) — `webapp/lib/import_daemon.js` (`pickReadyZip`)

ผู้ใช้ถามว่า "zip ไหนเกิน 20 นาที เอาไปต่อท้ายคิวได้ไหม" — วิเคราะห์แล้ว**ไม่ทำแบบ preempt/kill**:
ไฟล์ใหญ่ใช้ 20–33 นาที*โดยธรรมชาติ* (ไม่ใช่แขวน) ตัดที่ 20 นาทีจะทำให้ (ก) ไฟล์ใหญ่ไม่มีวันจบ
(LOAD DATA ไม่มี resume — เริ่มใหม่ก็โดนตัดอีก = วนลูป) (ข) เสียงาน I/O 20 นาทีทิ้งทุกรอบ
(ค) "ต่อท้ายคิว" ขัดกับคิวที่เรียงตาม logImportId ในชื่อไฟล์

ทางที่เลือกแทน (ตอบเจตนาเดียวกัน): **`pickReadyZip` หยิบไฟล์เล็กสุดก่อน** แทน FIFO
- ไฟล์ รพ.สต. (วินาทีเดียว) ไม่ต้องรอไฟล์ รพ.ใหญ่ (30 นาที) ที่บังเอิญ upload มาก่อน
- ไฟล์ใหญ่เริ่มเมื่อไม่มีตัวเล็กรอ แล้วรันรวดจนจบ — ไม่ preempt ไม่เสียงานทิ้ง ไม่มี loop
- ขนาดเท่ากันคงลำดับ upload เดิม (tiebreak ด้วย logImportId จาก listQueuedZips)
- ข้อแลกที่ยอมรับ: ไฟล์เล็กไหลเข้าต่อเนื่องจะเลื่อนไฟล์ใหญ่ออกไป — รูปแบบใช้งานจริง
  upload เป็นชุดแล้วหยุด ความเสี่ยงต่ำ; ถ้าเจอจริงค่อยเพิ่ม aging (รอเกิน X ชม. ให้ลัดคิว)
- กรณีไฟล์เล็กมาถึง*ระหว่าง*ไฟล์ใหญ่กำลังรัน ยังต้องรอจบ (~30 นาที) — ถ้าจะแก้ถึงจุดนั้น
  ต้องคุยเรื่อง express lane (concurrency 2 เฉพาะไฟล์เล็ก) เป็นงานอนาคต ระวังแย่ง disk I/O

### ⑤ Stale sweep เป็น file-aware + ลด staleMinutes 120 → 30

เดิม sweep ใช้ "เวลา" อย่างเดียวตัดสินว่า row กำพร้า → ผิดสองทาง: batch ใหญ่จริง
(อ.เมือง รอคิวเกิน 2 ชม. เป็นปกติ) โดน mark `not_complate` ทั้งที่กำลังรอ, ส่วน row
ผีจริงกลับต้องรอ 120 นาทีกว่าจะถูกเก็บ (block หน้า report ผ่าน `isImporting` ตลอด)

แก้: เกณฑ์ชี้ขาดเปลี่ยนเป็น **"ไฟล์ยังอยู่ไหม + worker กำลังทำไหม"**
- `collectQueuedImportIds()` สแกน `queue/` + `processing/` หา id จากชื่อไฟล์
- `activeImportIds` (Set) — id ที่ worker กำลังทำ (จำเป็นสำหรับไฟล์หย่อนมือใน
  processing/ ที่ไม่มี prefix id ในชื่อ)
- sweep SELECT row ที่แก่เกิน `staleMinutes` แล้ว**กรอง**: ข้าม id ที่มีไฟล์หรือ
  กำลังรัน → UPDATE เฉพาะกำพร้าแท้ (message ใหม่: "no queue file found")
- `staleMinutes` เหลือบทบาทแค่ minimum age กัน race → ลด default + config.json
  เป็น **30** — row ผีถูกเก็บเร็วขึ้น 4 เท่า, งานจริงรอนานแค่ไหนก็ไม่โดน mark
- quirk "แสดง not_complate ชั่วคราวแล้ว self-correct" หายทั้งก้อน

## ทดสอบจริงบน local docker (2026-07-09) — ผ่านทุกเคส

Build image ใหม่ + recreate เฉพาะ importer แล้วทดสอบด้วยไฟล์จริงจาก `C:\Users\Admin\Desktop\zip` (หย่อนเข้า `webapp/tmp/import/queue/` โดยตรง):

1. **คิวเล็กก่อน (④)**: หย่อน 4 ไฟล์ (copy ตัวใหญ่ 8.3MB ก่อน) → daemon หยิบเล็กสุดในบรรดาไฟล์ที่พ้น age เสมอ ตัวใหญ่สุดไปท้ายแม้มาก่อน ✅
2. **เคส 330 (signal-kill = interrupted)**: `docker restart` กลาง import ไฟล์ 34.5MB → log `interrupted (attempt 1/3), will re-queue: Import killed by SIGTERM` → **ไฟล์ไม่ถูกลบ** ถูกคืนคิว → retry เอง **จนครบ 2,002,082 แถว / 52 ตาราง** ✅ (ทำซ้ำกับไฟล์ 8.3MB ก็ผ่าน)
3. **ตำหนิที่เจอจากการทดสอบ → แก้แล้ว**: ไฟล์หย่อนมือ (ไม่มี prefix `id__`) ตอน requeue กลับไปด้วยชื่อเดิม → รอบ retry สร้าง log row ใหม่ ทิ้ง row เก่าค้าง `pending` (block `isImporting` จน stale sweep เก็บ 120 นาที). แก้: requeue ด้วยชื่อ `id__` (`buildQueueFileName`) → ทดสอบซ้ำ retry ใช้ id เดิม ไม่มี row กำพร้า ✅
4. **รูพี่น้องที่แก้พร้อมกัน**: `resolveLogImport` พังเพราะ DB ล่มชั่วคราว เดิมตกไป path ลบไฟล์ — ตอนนี้ classify ด้วย `isTransientImportFailure` แล้ว requeue แทน (นับ cap รวมกันผ่าน `trackRequeue` helper)
5. **File-aware sweep (⑤)**: สร้าง row pending อายุ 40 นาที 2 ตัว — ตัวกำพร้า (ไม่มีไฟล์) ถูกเก็บทันทีตอน daemon start (`Recovered 1 orphaned import record(s)` → `not_complate`), ตัวที่มีไฟล์ `200__*.zip` รอในคิว**ไม่โดนแตะ**ทั้งที่แก่เกิน threshold แล้วถูก import จนจบ `complete` ✅

หมายเหตุ: local DB มี row 89 = `not_complate` (orphan จากการทดสอบก่อนแก้ข้อ 3 — mark ปิดแล้ว ข้อมูลจริงอยู่ที่ row 90 complete)

## ข้อมูลจริงจาก อ.เมือง ยืนยันการตั้งค่า (วัด 2026-07-09)

วัดเวลา process จริงจาก gap ของ `finish_date_time` งานที่รันติดกันใน batch (คิวรันทีละงาน gap = เวลา process ของงานถัดไป ไม่ปนเวลารอคิว):

- **ไฟล์ใหญ่ F43_10676 (ZIP 16–19MB): ใช้จริง 20–33 นาทีต่อไฟล์** (1206–1952s; id 192 เริ่มตอนคิวว่าง วัดตรงได้ 30.7 นาที) — ไฟล์ 32.9MB (id 298) น่าจะราว ~1 ชม.
- ไฟล์เล็ก (0.1–0.9MB): 2–12 วินาที
- การกระจายทั้งหมด (รวมเวลารอคิว): `<1m`=199, `1-5m`=41, `5-20m`=29, `20-60m`=26, `>60m`=5

**นัยสำคัญ: watchdog 20 นาที (ค่าแรกก่อนทบทวนรอบสอง) จะ SIGKILL ไฟล์ใหญ่ของ อ.เมือง แทบทุกไฟล์** → ครบ retry cap → ลบไฟล์ = data loss ระบบใหญ่ทั้งระบบ. ค่า 2 ชม. มี headroom ~2–3.6× จากงานจริงที่ช้าสุดที่วัดได้

Config/resource จริงบนเครื่อง (ตรวจแล้วตรง repo):

- MariaDB: `net_read_timeout=3600`, `net_write_timeout=3600`, buffer pool 2560MB, max_connections 60
- Host: 4 cores, RAM 5.8GB (ใช้ ~3.0GB, swap 4GB ไม่ถูกแตะ), disk SSD 199GB ว่าง 166GB
- คอขวดไม่ใช่ disk space/RAM — คือ InnoDB REPLACE INTO ตารางใหญ่+ดัชนี (SSD แต่ 16MB ZIP ยังใช้ ~30 นาที)

พฤติกรรมเมื่อ hang เกิดอีกครั้ง (หลังแพตช์): server ตัดเองที่ 3600s → worker ได้ connection error → classifier จับเป็น transient → requeue (คิวถูกบล็อกสูงสุด ~1 ชม./ครั้ง, ครบ 3 ครั้งถึงปิดจ๊อบ); watchdog 2 ชม. ทำงานเฉพาะเมื่อชั้น server timeout พลาดด้วย. ถ้า network ตายสนิท connect จะ fail ทันที (ECONNREFUSED) → retry 3 รอบจบในไม่กี่นาที

## Tests

- **เพิ่ม 11 tests** ใน `webapp/tests/import-daemon.test.mjs`: re-queue-on-interrupt (+requeue ชื่อ `id__` +transient catch), watchdog SIGKILL, `requeueLogImport` reset SQL, LOAD DATA net timeout, signal-kill (`code null`) = interrupted, retry cap, `isTransientImportFailure` (behavior test แยก network vs data error), `pickReadyZip` เลือกไฟล์เล็กก่อน (behavior test บนคิวจำลอง), file-aware sweep, default staleMinutes = 30
- **ปรับ 2 tests** ใน `webapp/tests/import-f43.test.mjs`: mock `query` ให้ผ่าน statement `SET SESSION ...` ที่มาก่อน `LOAD DATA`
- Full suite:
  ```powershell
  cd webapp; node --test tests/*.test.mjs
  ```
  ผล: **183 passed, 0 failed**

---

## ไฟล์ที่แตะ (branch `tehn/update`, ยังไม่ commit)

- `webapp/lib/import_f43_load_data.js` — net timeout
- `webapp/lib/import_daemon.js` — watchdog + re-queue + `requeueLogImport()`
- `webapp/tests/import-daemon.test.mjs` — +5 tests
- `webapp/tests/import-f43.test.mjs` — ปรับ 2 mocks

---

## Follow-ups ที่ค้าง (รอผู้ใช้)

1. ~~Re-upload `F43_07492`~~ — **ผู้ใช้ตัดสินใจไม่ re-upload (2026-07-10)** ปิดประเด็น ไม่ต้องตามต่อ
2. **Deploy แพตช์** ไป อ.เมือง — ตาม `deploy-mueang` memory: **build `webapp` image แยกก่อน** (เสี่ยง OOM) แล้วค่อย recreate `importer` โดยไม่กระทบ container อื่น
   ```powershell
   # อ.เมือง (ผ่าน SSH): build แยก แล้ว recreate เฉพาะ importer
   docker compose build webapp
   docker compose up -d --no-build --no-deps --force-recreate importer
   ```

---

## เรื่องเกี่ยวข้อง (คนละ issue) — sync outbound 443 ถูก block

ระหว่างสืบสวน เจอว่า `sync` container อีกไซต์หนึ่งได้ `fetch failed` / `UND_ERR_CONNECT_TIMEOUT` ตอน POST ไป `subhdc.plkhealth.go.th:443`

- **DB + endpoint ปกติดี** — เครื่อง dev ยิงได้ `201` (0.16s)
- ปัญหาคือ **outbound TCP 443 ของเครื่อง deploy ถูก firewall block / เน็ตไม่เสถียร** (Windows host เจอ `CRYPT_E_REVOCATION_OFFLINE` ด้วย; Linux container เจอ `UND_ERR_CONNECT_TIMEOUT`)
- **ทางแก้ = network-side**: เปิด outbound 443 ไป `61.19.112.242` (แจ้ง admin/IT ไซต์นั้น)
- `sync/post/*.js` `postToSsj` ยัง**ไม่มี retry/timeout** — เป็น candidate hardening ถ้าเกิดซ้ำ (คล้ายแพตช์ import ข้างบน)
