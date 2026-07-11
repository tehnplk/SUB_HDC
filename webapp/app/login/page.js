import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { LayoutDashboard, LockKeyhole, LogIn } from "lucide-react";

async function loginAction(formData) {
  "use server";

  const callbackUrl = String(formData.get("callbackUrl") || "/import-check/files-count");

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = typeof params?.callbackUrl === "string" ? params.callbackUrl : "/import-check/files-count";
  const hasError = params?.error === "1";

  return (
    <main className="main loginMain">
      <section className="panel loginPanel">
        <div className="loginHeader">
          <span className="iconBadge">
            <LockKeyhole aria-hidden="true" />
          </span>
          <div className="titleText">
            <p className="eyebrow">Protected workspace</p>
            <h1>Sign in</h1>
          </div>
        </div>

        {hasError ? <div className="error">Invalid username or password</div> : null}

        <form action={loginAction} className="loginForm">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label>
            Username
            <input name="username" type="text" autoComplete="username" required autoFocus />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="primary">
            <LogIn aria-hidden="true" />
            Sign in
          </button>
          <Link href="/" className="loginDashboardLink">
            <LayoutDashboard aria-hidden="true" />
            Dashboard
          </Link>
        </form>
      </section>
    </main>
  );
}
