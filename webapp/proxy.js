import { NextResponse } from "next/server";
import { auth } from "./auth";

// /quality (portal) เปิดให้เห็น topic list ได้ — ป้องกันเฉพาะหน้าข้อมูลย่อยแทน
const PROTECTED_PAGE_PREFIXES = [
  "/person",
  "/ai",
  "/dashboard/report",
  "/report",
  "/quality/person-dup",
  "/quality/service-instype-err",
  "/quality/specialpp-error",
  "/admin",
];
const GUEST_PROTECTED_MESSAGE = "กรุณาติดต่อผู้ดูแลระบบประจำอำเภอของท่าน\nเพื่อขอสิทธิระดับ User ขึ้นไปในการเข้าถึงข้อมูลนี้";
const ADMIN_PROTECTED_MESSAGE = "เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่เข้าถึงส่วนนี้ได้";
// /admin (page) และ /api/admin (API) สงวนไว้ให้ role admin เท่านั้น —
// เดิมกันเฉพาะ guest ที่ proxy แล้วให้ page/route เช็ค admin เอง ตอนนี้กันที่ proxy ด้วย
const ADMIN_ONLY_PAGE_PREFIXES = ["/admin"];
const ADMIN_ONLY_API_PREFIXES = ["/api/admin"];
// /api/quality/* ป้องกันตัวเองใน route (requireApiJwt) — export เปิดตรงจาก browser
// จึง redirect ไป /error/msg ไม่ได้ถ้าถูก proxy ตอบ 401 ตัดหน้า
const PROTECTED_API_PREFIXES = [
  "/api/ai",
  "/api/person",
  "/api/raw-records",
  "/api/report",
  "/api/admin",
];

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES);
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  if (request.auth?.user) {
    if (Number(request.auth.user.roleId) === 4) {
      if (isProtectedApi) {
        return Response.json({ error: GUEST_PROTECTED_MESSAGE }, { status: 403 });
      }
      const errorUrl = new URL("/err", request.nextUrl.origin);
      errorUrl.searchParams.set("msg", GUEST_PROTECTED_MESSAGE);
      return NextResponse.redirect(errorUrl);
    }
    const isAdmin = request.auth.user.isConfiguredUser === true
      || Number(request.auth.user.roleId) === 1;
    if (!isAdmin) {
      if (matchesPrefix(pathname, ADMIN_ONLY_API_PREFIXES)) {
        return Response.json({ error: ADMIN_PROTECTED_MESSAGE }, { status: 403 });
      }
      if (matchesPrefix(pathname, ADMIN_ONLY_PAGE_PREFIXES)) {
        const errorUrl = new URL("/err", request.nextUrl.origin);
        errorUrl.searchParams.set("msg", ADMIN_PROTECTED_MESSAGE);
        return NextResponse.redirect(errorUrl);
      }
    }
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|encrypted.png).*)"],
};
