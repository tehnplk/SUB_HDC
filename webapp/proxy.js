import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createApiJwt,
  getApiJwtCookieOptions,
  getCookieValue,
  verifyApiJwt,
} from "./lib/api-auth.mjs";

function shouldIssueApiJwt(pathname) {
  return (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.includes(".")
  );
}

export async function proxy(request) {
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "GET") {
    const token = getCookieValue(request.headers.get("cookie"), AUTH_COOKIE_NAME);
    if (!(await verifyApiJwt(token))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (request.method !== "GET" || !shouldIssueApiJwt(request.nextUrl.pathname)) {
    return response;
  }

  const token = getCookieValue(request.headers.get("cookie"), AUTH_COOKIE_NAME);
  if (await verifyApiJwt(token)) {
    return response;
  }

  response.cookies.set(AUTH_COOKIE_NAME, await createApiJwt(), getApiJwtCookieOptions());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
