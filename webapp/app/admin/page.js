import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decideAccess } from "@/lib/access.mjs";
import AdminUserManager from "./user-manager";

export default async function AdminPage() {
  const session = await auth();
  const denied = decideAccess({ user: session?.user, pathname: "/admin" });
  if (denied) redirect(denied.headers.get("Location"));
  return <AdminUserManager />;
}
