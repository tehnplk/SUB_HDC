// นโยบายสิทธิ์เข้าถึงทั้งระบบ — proxy.js และ route handler ใช้ตารางเดียวกันนี้

// c_user_role.id (lookup คงที่)
export const ROLE = { ADMIN: 1, SUPERUSER: 2, USER: 3, GUEST: 4 };

// ระดับขั้นต่ำ: LOGIN = login แล้ว (รวม guest), MEMBER = user ขึ้นไป, ADMIN = admin
export const LEVEL = { LOGIN: ROLE.GUEST, MEMBER: ROLE.USER, ADMIN: ROLE.ADMIN };

// kind: page → redirect ไป login/err, api → JSON 401/403,
// export → ลิงก์ที่เปิดตรงจาก browser จึง redirect ไป /error/msg แทน JSON
// prefix ที่ยาวที่สุดชนะ; path ที่ไม่อยู่ในตาราง = สาธารณะ
export const POLICIES = [
  // /quality (portal) เปิดให้เห็น topic list — ป้องกันเฉพาะหน้าข้อมูลย่อย
  { prefix: "/gis", kind: "page", level: LEVEL.MEMBER },
  { prefix: "/upload", kind: "page", level: LEVEL.MEMBER },
  { prefix: "/quality/person-dup", kind: "page", level: LEVEL.MEMBER },
  { prefix: "/admin", kind: "page", level: LEVEL.ADMIN },

  { prefix: "/api/raw-records", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/upload-zip", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/import-zip", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/log-import/cleanup", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/quality/person-dup", kind: "api", level: LEVEL.MEMBER },
  // ข้อมูลรายบุคคล (ชื่อ วันเกิด ที่อยู่) — ชั้นข้อมูลอื่นของ /api/gis ไม่มี PII จึงเปิดสาธารณะ
  { prefix: "/api/gis/vulnerable", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/gis/person-search", kind: "api", level: LEVEL.MEMBER },
  { prefix: "/api/admin", kind: "api", level: LEVEL.ADMIN },
  // GET อ่านยอดเป็นสาธารณะ; POST นับเฉพาะผู้ login
  { prefix: "/api/visit-counter", methods: ["POST"], kind: "api", level: LEVEL.LOGIN },

  { prefix: "/api/quality/person-dup/export", kind: "export", level: LEVEL.MEMBER },
];

const MEMBER_MESSAGE = "กรุณาติดต่อผู้ดูแลระบบประจำอำเภอของท่าน\nเพื่อขอสิทธิระดับ User ขึ้นไปในการเข้าถึงข้อมูลนี้";
const ADMIN_MESSAGE = "เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่เข้าถึงส่วนนี้ได้";
const EXPORT_LOGIN_MESSAGE = "ต้องเข้าสู่ระบบก่อนจึงจะส่งออก Excel ได้";

// บัญชี .env (isConfiguredUser) = admin; roleId ที่อ่านไม่ได้ถือเป็น guest (fail closed)
export function roleOf(user) {
  if (!user) return null;
  if (user.isConfiguredUser === true) return ROLE.ADMIN;
  const roleId = Number(user.roleId);
  return Number.isInteger(roleId) && roleId >= ROLE.ADMIN && roleId <= ROLE.GUEST ? roleId : ROLE.GUEST;
}

export function isAdmin(user) {
  return roleOf(user) === ROLE.ADMIN;
}

export function policyFor(pathname, method = "GET") {
  let match = null;
  for (const policy of POLICIES) {
    if (policy.methods && !policy.methods.includes(method)) continue;
    if (pathname !== policy.prefix && !pathname.startsWith(`${policy.prefix}/`)) continue;
    if (!match || policy.prefix.length > match.prefix.length) match = policy;
  }
  return match;
}

// origin: proxy ต้องส่ง (middleware ของ Next รับ Location แบบ absolute เท่านั้น
// แล้วแปลงกลับเป็น relative เอง); route handler ไม่ส่ง → Location relative
function redirectTo(path, origin) {
  return new Response(null, {
    status: 302,
    headers: { Location: origin ? new URL(path, origin).toString() : path },
  });
}

function withMsg(path, msg) {
  return `${path}?${new URLSearchParams({ msg })}`;
}

// pure: คืน null = ผ่าน หรือ Response ที่ปฏิเสธ
export function decideAccess({ user, pathname, method = "GET", search = "", origin, policy = policyFor(pathname, method) }) {
  if (!policy) return null;
  const role = roleOf(user);
  if (role !== null && role <= policy.level) return null;

  if (role === null) {
    if (policy.kind === "api") return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (policy.kind === "export") return redirectTo(withMsg("/error/msg", EXPORT_LOGIN_MESSAGE), origin);
    return redirectTo(`/login?${new URLSearchParams({ callbackUrl: `${pathname}${search}` })}`, origin);
  }

  const message = policy.level === LEVEL.ADMIN ? ADMIN_MESSAGE : MEMBER_MESSAGE;
  if (policy.kind === "api") return Response.json({ error: message }, { status: 403 });
  // login แล้วแต่สิทธิไม่พอ — /err คือหน้าเดียวกับ /error/msg แต่ไม่มีปุ่มเข้าสู่ระบบ
  return redirectTo(withMsg("/err", message), origin);
}

// ทางลัดสำหรับ test route ที่ import handler ตรง (ไม่มี session) — ปิดตายใน production
function testBypassUser() {
  if (process.env.AUTH_TEST_BYPASS === "1" && process.env.NODE_ENV !== "production") {
    return { isConfiguredUser: true };
  }
  return null;
}

// สำหรับ route handler: โหลด session แล้วตัดสินด้วยตารางเดียวกับ proxy
export async function requireAccess(request) {
  const { pathname } = new URL(request.url);
  const policy = policyFor(pathname, request.method);
  if (!policy) throw new Error(`No access policy for ${request.method} ${pathname}`);

  let user = testBypassUser();
  let session = user ? { user } : null;
  if (!user) {
    const { auth } = await import("../auth.js");
    session = await auth();
    user = session?.user;
  }
  return { session, denied: decideAccess({ user, pathname, policy }) };
}
