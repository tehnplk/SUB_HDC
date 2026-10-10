# Hand-off: Error Page

## มาตรฐาน

หน้าแจ้ง error กลางอยู่ที่ `/error/msg` — ใช้กับ flow ที่ผู้ใช้เปิดลิงก์ตรงจาก
browser (เช่นลิงก์ดาวน์โหลด) ซึ่งตอบ JSON 401/403 ไม่ได้ แสดงเป็น card danger
(หัวข้อ "ไม่มีสิทธิ" + ปุ่มเข้าสู่ระบบ)

- Page: `webapp/app/error/msg/page.js` — ข้อความส่งผ่าน query `?msg=`
  ไม่ส่งมาใช้ default "คุณไม่มีสิทธิเข้าใช้งานส่วนนี้"
- style: `.errorMsgCard` / `.errorMsgAction` ใน `globals.css`
- เพิ่มจุดใช้งานใหม่: redirect มาที่ `/error/msg?msg=...` ได้เลย
  ไม่ต้องแก้ตัวหน้า
- `/err` (`webapp/app/err/page.js`) = หน้าเดียวกันแต่ไม่มีปุ่มเข้าสู่ระบบ
  (`showLogin={false}`) — ใช้เมื่อ login แล้วแต่สิทธิไม่พอ

## กติกาสำหรับ API route

ไม่ต้องเขียน redirect เอง — ลงทะเบียน endpoint ใน `POLICIES` ของ
`webapp/lib/access.mjs` ด้วย `kind: "export"` (ลิงก์ที่เปิดตรงจาก browser)
แล้วเรียก `requireAccess` ใน handler:

```js
// lib/access.mjs
{ prefix: "/api/<topic>/export", kind: "export", level: LEVEL.MEMBER },

// route.js
const { denied } = await requireAccess(request);
if (denied) return denied;
```

- `kind: "export"`: ไม่ได้ login → 302 `/error/msg?msg=ต้องเข้าสู่ระบบก่อนจึงจะส่งออก Excel ได้`;
  login แล้วสิทธิไม่พอ → 302 `/err?msg=...`
- **`Location` ใน route handler เป็น relative** — `requireAccess` ไม่ส่ง
  `origin` ให้ `decideAccess` (production อยู่หลัง reverse proxy, `request.url`
  เห็นเป็น host ภายใน container); มีแค่ `proxy.js` ที่ส่ง `origin` เพราะ
  middleware ของ Next รับ Location แบบ absolute เท่านั้น
- API ที่ถูกเรียกผ่าน `fetch` ในหน้าเว็บ ใช้ `kind: "api"` → 401/403 JSON
  ไม่ redirect

## การทดสอบ

```powershell
cd webapp
node --test tests\access.test.mjs tests\standard-pages.test.mjs
```

`access.test.mjs` ตรวจว่า export ที่ไม่ login ได้ 302 ไป `/error/msg?msg=...`
และ guest ได้ 302 ไป `/err?msg=...`
