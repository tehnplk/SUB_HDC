# Hand-off: Add-On Auth

## ภาพรวม

ระบบเสริม (add-on) ภายนอกที่ถูกลิงก์จากเมนู **Add-On** จะได้รับ `session-id`
(= `cid_hash` ของผู้ใช้ที่ login) มาทาง query string ของ URL ปลายทาง เช่น

```
https://<addon>/dashboard/check?session-id=<cid_hash>
```

ระบบเสริมนำ `session-id` นั้นมา **ค้นว่าเป็นผู้ใช้คนไหน** โดยเรียก endpoint
`POST|GET /api/addon-auth` ของ SUB-HDC ซึ่งป้องกันด้วย JWT (secret = `JWT_KEY`)

- เมนู Add-On + การต่อ `session-id`: ดู `webapp/app/api/addon-url/route.js`
- endpoint ตรวจสอบ: `webapp/app/api/addon-auth/route.js`
- ตัวตรวจ JWT: `webapp/lib/api-auth.mjs` (`verifyApiJwt`)
- ผู้ใช้ที่ **ไม่ได้ login** จะไม่มี `session-id` ต่อมาใน URL — ระบบเสริมควร
  ปฏิบัติเป็น guest

## Endpoint

```
GET  /api/addon-auth?session-id=<cid_hash>
POST /api/addon-auth        body: { "session-id": "<cid_hash>" }
Header: Authorization: Bearer <JWT>
```

- runtime nodejs; ไม่อยู่ใน `PROTECTED_API_PREFIXES` (proxy.js) — ป้องกันเองใน
  route ด้วย Bearer JWT

### การยืนยันสิทธิ์ (JWT)

ระบบเสริมต้องแนบ **Bearer token** ที่ sign เอง ด้วย secret เดียวกับ `JWT_KEY`
ของ SUB-HDC (แชร์ล่วงหน้าแบบ out-of-band) — เป็น HS256 มี claim:

| claim | ค่า |
|---|---|
| `alg` (header) | `HS256` |
| `typ` (header) | `JWT` |
| `aud` | `sub-hdc-api` |
| `iat` | unix seconds ปัจจุบัน |
| `exp` | unix seconds หมดอายุ (ต้อง > เวลาปัจจุบัน) |

`verifyApiJwt` ปฏิเสธถ้า: alg ไม่ใช่ HS256, `aud` ไม่ใช่ `sub-hdc-api`, `exp`
หมดอายุ/ไม่มี, หรือ signature ไม่ตรง → ตอบ `401 {"error":"Unauthorized"}`

### Response

| สถานะ | body |
|---|---|
| `200` | `{ "found": true, "user": { ...ทุก field ของ c_user_provider, role_name, hospname, profile } }` |
| `404` | `{ "found": false }` — ไม่พบ cid_hash นี้ (hash ไม่ตรง/ผู้ใช้ถูกลบ) |
| `400` | `{ "error": "session-id is required" }` |
| `401` | `{ "error": "Unauthorized" }` — JWT ไม่ผ่าน |
| `500` | `{ "error": "<message>" }` |

- **คืนทุก field ของผู้ใช้** จาก `c_user_provider` (`SELECT u.*`) รวม
  `id, provider_id, cid_hash, fullname, hoscode, role, login_count,
  last_activity, is_active, note` + เพิ่ม `role_name` (ชื่อ role จาก
  `c_user_role`) และ `hospname` (จาก `c_hospital`)
- `profile` = โปรไฟล์ ProviderID ดิบ (parse จาก longtext JSON เป็น object;
  parse ไม่ได้/ว่าง = `null`)
- `is_active` แปลงเป็น boolean; `is_active=false` คือผู้ใช้ถูกปิดใช้งาน —
  ระบบเสริมควรปฏิเสธ
- payload มีข้อมูลส่วนบุคคล (`cid_hash`, `profile` ฯลฯ) — ต้องส่งผ่าน HTTPS และ
  ระบบเสริมเก็บอย่างปลอดภัย

## ตัวอย่างฝั่งระบบเสริม

### สร้าง JWT (Node.js — ไม่ต้องมี lib เสริม)

```js
import { createHmac } from "node:crypto";

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function signAddonJwt(secret, ttlSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    aud: "sub-hdc-api", iat: now, exp: now + ttlSeconds,
  }));
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(body).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${body}.${sig}`;
}
```

### เรียก endpoint

```js
const sessionId = new URL(request.url).searchParams.get("session-id");
const token = signAddonJwt(process.env.SUBHDC_JWT_KEY);

const res = await fetch(
  `https://subhdc.plkhealth.go.th/api/addon-auth?session-id=${encodeURIComponent(sessionId)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);

if (res.status === 401) throw new Error("JWT ไม่ถูกต้อง");
const data = await res.json();
if (!data.found) {
  // แสดง guest / ปฏิเสธ
} else if (!data.user.is_active) {
  // ผู้ใช้ถูกปิดใช้งาน
} else {
  // data.user = { id, provider_id, fullname, hoscode, hospname, role, is_active }
}
```

### PHP (สร้าง JWT)

```php
function sign_addon_jwt(string $secret, int $ttl = 300): string {
  $b64 = fn($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
  $now = time();
  $header  = $b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
  $payload = $b64(json_encode(['aud' => 'sub-hdc-api', 'iat' => $now, 'exp' => $now + $ttl]));
  $body = "$header.$payload";
  $sig  = $b64(hash_hmac('sha256', $body, $secret, true));
  return "$body.$sig";
}
```

## ความปลอดภัย

- `JWT_KEY` เป็นความลับที่**แชร์เฉพาะกับระบบเสริมที่เชื่อถือได้** — รั่วเมื่อไหร่
  ใครก็ปลอม token เรียก endpoint นี้ได้ ควรหมุน (rotate) เมื่อสงสัยว่ารั่ว
- ตั้ง `exp` สั้น (แนะนำ ≤ 5 นาที) sign ต่อครั้งที่เรียก ลดโอกาส replay
- `session-id` (cid_hash) เป็นตัวระบุตัวตนแบบ opaque ย้อนกลับเป็นเลขบัตรไม่ได้
  แต่ **ใครถือ hash ก็อ้างเป็นผู้ใช้นั้นได้** — endpoint นี้จึงต้องมี JWT กันคน
  นอกยิง cid_hash สุ่ม/เดารายชื่อ; ระบบเสริมไม่ควรเปิด cid_hash ต่อสาธารณะ
- เรียกผ่าน HTTPS เท่านั้น

## การทดสอบ

```powershell
cd webapp
node --test tests\addon-auth.test.mjs
```

read-source assertion: มี `verifyApiJwt`/Bearer, 401 เมื่อ JWT ไม่ผ่าน, 400 เมื่อ
ไม่มี `session-id`, ค้นด้วย `cid_hash`, และไม่ select/คืน `cid_hash`/`profile`
