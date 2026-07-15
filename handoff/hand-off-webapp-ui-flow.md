# Hand-off: Webapp UI Flow

## ProviderID login

- `/login` keeps username/password and adds `เข้าสู่ระบบด้วย ProviderID` as the primary action.
- When no valid local callback URL is supplied, both sign-in methods redirect to `/import-check/compare-hdc-person`.
- Authentication starts at Health ID OAuth, returns to `/api/auth/healthid`, exchanges the Health ID token for a Provider ID token/profile, and creates an Auth.js JWT session.
- The protected-page `callbackUrl` is kept in the short-lived, httpOnly `provider_callback_url` cookie.
- First-time ProviderID users are inserted into `c_user_provider` with the active `user` role ID from `c_user_role`. Returning users refresh profile and `last_activity`; users with `is_active = 0` are denied.
- Required env names: `HEALTH_CLIENT_ID`, `HEALTH_CLIENT_SECRET`, `HEALTH_REDIRECT_URI`, `PROVIDER_CLIENT_ID`, `PROVIDER_CLIENT_SECRET`.

## Admin user management

- `/admin` is available only to the configured `.env` account or a ProviderID user with `c_user_provider.role = 1`; the API repeats the same authorization check.
- The configured username/password account receives the `admin` role. `c_user_provider.role` stores `c_user_role.id`, which is resolved to its role name for ProviderID sessions.
- `/api/admin/users` lists non-sensitive user fields and allows only `role_id`, `is_active`, and `note` updates. It never returns `cid_hash` or the saved profile.
- Administrators can hard-delete another ProviderID user after an explicit confirmation; they cannot delete their own ProviderID account.
- The user menu shows `Manage users` only for administrators.
- Role/status changes apply to the user's next login because ProviderID sessions are JWT-based with a 24-hour maximum age.
- `c_user_provider.login_count` starts at 1 on the first successful ProviderID login and increments on every later successful ProviderID login; `/admin` displays it as `LOGIN (ครั้ง)`.

มาตรฐานกลางของ**ทุกเพจ** — ไม่ผูกกับเพจใดเพจหนึ่ง

## Shell

- The app icon in the shared module header links to `/` (the landing page).

- ทุกโมดูลใช้ shell เดียวกันผ่าน `ModuleHeader` (โลโก้ + ชื่อระบบ + main tab +
  breadcrumb) — ไม่มี tab bar ชั้นที่สอง และ**ไม่มี hero/banner** ทุกหน้า
  เริ่มที่ `ModuleHeader` แล้วเข้าเนื้อหาเลย
- ทุกหน้า render `<ModuleHeader subtitle="..." />` บนสุดของ panel

## เส้นทาง

- legacy route redirect ถาวรใน `next.config.mjs` — ห้ามปล่อย route เก่า
  ตอบเนื้อหาซ้ำกับ route ใหม่
- หน้าเดียวกันที่โผล่หลาย path ใช้ re-export
  (`export { default } from "..."`) — แก้ที่ไฟล์ต้นทางไฟล์เดียว

## เพิ่มหน้า/โมดูลใหม่ต้องทำ 3 ที่

1. `webapp/components/main-tab.jsx` — ลำดับ tab = ลำดับ array `TABS`;
   โมดูลที่มีหน้าลูกต้องเพิ่มเงื่อนไข `startsWith` ให้ active state
2. `webapp/components/module-header.jsx` — เพิ่ม entry ใน
   `BREADCRUMB_MODULES` (path ที่ไม่อยู่ในลิสต์ไม่ crash แค่ไม่มี breadcrumb)
3. test — test เป็นแบบ read-source (regex กับไฟล์จริง) เพิ่ม/ย้ายหน้า
   ต้องอัปเดต test ที่อ้าง path/เนื้อหาเดิม

หน้า index ของโมดูลเป็นลิสต์เมนู `moduleTopicList` — ข้อความ bullet
สื่อความเดียวกับ subtitle ของหน้าปลายทาง (ไม่ต้องตรงคำต่อคำ)

## แบบแผน UI (ตกลงกับ user แล้ว — ต้องทำตาม)

- **ห้ามมี label เกินจำเป็น** — filter control ไม่มี visible label ใช้
  placeholder หรือ default option ที่สื่อความหมายแทน (ใส่
  `<span className="srOnly">` เพื่อ accessibility); subtitle/หัวคอลัมน์/
  ข้อความ meta สั้นพอสื่อความหมาย ไม่อธิบายซ้ำกับสิ่งที่ UI สื่ออยู่แล้ว
- **คอลัมน์หน่วยบริการ**: รหัสนำหน้า ตามด้วยชื่อย่อใน
  `<span className="hospNameShort">` บรรทัดเดียว — ชื่อย่อจาก
  `getHospNameMap` (`c_hospital.hospname_short`)
- **คอลัมน์ตัวเลขสำคัญแยกสี**: กำหนดเป็นคู่ class `<ชื่อ>Header/<ชื่อ>Cell`
  ใน `globals.css` ใช้ทั้ง `<th>` และ `<td>` เสมอ
- **stat cards**: `statGrid` + `statCard` (icon/value/label) แสดง "…"
  ระหว่างโหลด
- **datagrid header label**: ป้ายบอกที่มา/เวลาของข้อมูลเหนือตาราง —
  บรรทัดเดียวชิดขวา ตัวเล็กจาง (font 11px น้ำหนักปกติ สี `var(--muted)`)
  มี icon lucide เล็ก (13px) นำหน้า สื่อความหมายของข้อมูล เช่น `RefreshCw`
  สำหรับเวลา sync/ประมวลผล; ระหว่างโหลดแสดง "…" — ต้นแบบ:
  `.compareHdcSyncMeta` (หน้า `/import-check/compare-hdc-person`)
- **ตารางแบบ group คอลัมน์** (หลายค่าใต้หัวข้อเดียว เช่น HDC/SUB-HDC/ส่วนต่าง
  ต่อ type): thead 2 ชั้น — ชั้นแรกคอลัมน์คงที่ใช้ `rowSpan={2}` + หัวกลุ่ม
  `colSpan` ชั้นสองเป็นคอลัมน์ย่อย; คั่นกลุ่มด้วยเส้นซ้าย
  (`border-left` บนหัวกลุ่มและคอลัมน์แรกของกลุ่ม เช่น
  `compareGroupHeader`/`compareGroupCol`); กลุ่มสำคัญเน้นด้วยคู่ class
  `<ชื่อ>Header/<ชื่อ>Cell` ตามข้อบน กลุ่มรองกดให้เล็กและจางด้วย class
  เดียวทั้ง th/td (เช่น `compareDimCol`)
- **ส่งออก xlsx ราย row**: หัวคอลัมน์ "รายชื่อแบบปกปิด" + icon
  `FileSpreadsheet` (class `exportXlsxLink`) ลิงก์ตรงไป API export —
  endpoint ต้อง login ไม่งั้น redirect ไป `/error/msg`
  (ดู @handoff/hand-off-err.md) และห้ามส่งออกคอลัมน์ `cid`

## โครงหน้าตารางมาตรฐาน

`ModuleHeader` → `statGrid` → toolbar (ค้นหา + ปุ่มรีเฟรช) → `tableMeta`
(+ "Transform ล่าสุด" จาก `log_transform`) → `tableWrap > fileTable`

data flow: page (client) → `fetch("/api/...", { cache: "no-store" })` →
API route อ่าน**ตารางสรุปของ transform** (ไม่ query ตารางดิบ) — หน้าใหม่
ควรมี API + ตารางสรุปของตัวเอง ดู @handoff/hand-off-transform.md

## Work Load

- `/workload/ncdscreen-workload` filters every displayed topic (DM and HT),
  summary, and monthly trend by `สังกัด`. The affiliation lookup comes from
  `c_hostype.hostype_name` joined through `c_hospital.hostype_new`, with
  `c_hospital.dep_name` as fallback.

## การทดสอบ

```powershell
cd webapp
node --test tests\*.test.mjs
```

## Root landing page

- `/` uses the standard `main dashboardMain > panel panelWide dashboardPanel > ModuleHeader` shell.
- The page body presents four cards without a separate content heading: quality checking, target registry, gap tracking, and performance summary.
- The introduction uses `webapp/public/ai.png` as a responsive supporting visual.
- Keep the cards in a 2x2 grid before the AI image on desktop and one column on mobile.
- Focused source test: `webapp/tests/landing-page.test.mjs`.
