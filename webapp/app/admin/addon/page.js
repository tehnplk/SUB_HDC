import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import AdminAddonManager from "./addon-manager";

export default async function AdminAddonPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/addon");
  if (!isAdminSession(session)) redirect("/error/msg?msg=Admin%20access%20required");
  return <AdminAddonManager />;
}
