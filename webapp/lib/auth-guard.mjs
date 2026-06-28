export async function requireAppAuth() {
  if (process.env.AUTH_TEST_BYPASS === "1") return null;

  const { auth } = await import("../auth.js");
  const session = await auth();
  if (session?.user) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
