import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decideAccess } from "@/lib/access.mjs";
import AdminAddonManager from "./addon-manager";

export default async function AdminAddonPage() {
  const session = await auth();
  const denied = decideAccess({ user: session?.user, pathname: "/admin/addon" });
  if (denied) redirect(denied.headers.get("Location"));
  return <AdminAddonManager />;
}
