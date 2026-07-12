import { NextResponse } from "next/server";
import { auth } from "./auth";

const PROTECTED_PAGE_PREFIXES = ["/person", "/ai", "/dashboard/report", "/report", "/quality"];
// /api/quality/* ป้องกันตัวเองใน route (requireApiJwt) — export เปิดตรงจาก browser
// จึง redirect ไป /error/msg ไม่ได้ถ้าถูก proxy ตอบ 401 ตัดหน้า
const PROTECTED_API_PREFIXES = [
  "/api/ai",
  "/api/person",
  "/api/raw-records",
  "/api/report",
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
