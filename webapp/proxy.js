import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decideAccess } from "./lib/access.mjs";

// นโยบายทั้งหมดอยู่ใน lib/access.mjs (POLICIES)
export const proxy = auth((request) => {
  const { pathname, search, origin } = request.nextUrl;
  return decideAccess({
    user: request.auth?.user,
    pathname,
    method: request.method,
    search,
    origin,
  }) || NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|encrypted.png).*)"],
};
