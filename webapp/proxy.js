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
