import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import AdminUserManager from "./user-manager";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (!isAdminSession(session)) redirect("/error/msg?msg=Admin%20access%20required");
  return <AdminUserManager />;
}
