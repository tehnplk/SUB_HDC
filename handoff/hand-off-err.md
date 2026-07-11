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

## กติกาสำหรับ API route

- endpoint ที่ถูกเปิดตรงจาก browser และต้อง login:

```js
const unauthorized = await requireApiJwt(request);
if (unauthorized) {
  const msg = encodeURIComponent("ต้องเข้าสู่ระบบก่อนจึงจะ...ได้");
  return new Response(null, {
    status: 302,
    headers: { Location: `/error/msg?msg=${msg}` },
  });
}
```

- **`Location` ต้องเป็น relative เท่านั้น** — ห้ามสร้าง absolute URL จาก
  `request.url` เพราะ production อยู่หลัง reverse proxy ทำให้เห็นเป็น host
  ภายใน container ผู้ใช้จะถูกส่งไปผิดที่
- API ที่ถูกเรียกผ่าน `fetch` ในหน้าเว็บ (ไม่ใช่เปิดลิงก์ตรง) ตอบ 401 JSON
  ผ่าน `requireApiJwt` ตามปกติ — ไม่ redirect

## การทดสอบ

```powershell
cd webapp
node --test tests\standard-pages.test.mjs
```

ตรวจ endpoint ที่ใช้ pattern นี้: เรียกโดยไม่ login ต้องได้ 302 ไป
`/error/msg?msg=...` และหน้าปลายทางแสดง card "ไม่มีสิทธิ"
