import { auth } from "../auth.js";

export function isAdminSession(session) {
  return session?.user?.isConfiguredUser === true || Number(session?.user?.roleId) === 1;
}

export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdminSession(session)) {
    return { response: Response.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { session };
}
