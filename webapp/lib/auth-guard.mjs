export async function requireAppAuth() {
  if (process.env.AUTH_TEST_BYPASS === "1") return null;

  const { auth } = await import("../auth.js");
  const session = await auth();
  if (session?.user) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireExcelExportAccess() {
  if (process.env.AUTH_TEST_BYPASS === "1") return null;

  const { auth } = await import("../auth.js");
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (Number(session.user.roleId) === 4) {
    return Response.json({ error: "Guest users cannot export Excel files" }, { status: 403 });
  }
  return null;
}
