import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { IdCard, LayoutDashboard, LockKeyhole, LogIn } from "lucide-react";

const DEFAULT_CALLBACK_URL = "/import-check/compare-hdc-person";

function localCallbackUrl(value) {
  const callbackUrl = String(value || "");
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !callbackUrl.includes("\\")
    ? callbackUrl
    : DEFAULT_CALLBACK_URL;
}

async function providerLoginAction(formData) {
  "use server";
  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));
  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  if (!clientId || !redirectUri) redirect("/login?error=provider_config");

  const cookieStore = await cookies();
  cookieStore.set("provider_callback_url", callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = new URL("https://moph.id.th/oauth/redirect");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  redirect(url.toString());
}

async function loginAction(formData) {
  "use server";

  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));

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
  const callbackUrl = localCallbackUrl(params?.callbackUrl);
  const error = typeof params?.error === "string" ? params.error : "";
  const errorMessage =
    error === "1"
      ? "Invalid username or password"
      : error === "provider_not_allowed"
        ? "ProviderID นี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบ"
        : error
          ? "ไม่สามารถเข้าสู่ระบบด้วย ProviderID ได้ กรุณาลองใหม่อีกครั้ง"
          : "";

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

        {errorMessage ? <div className="error">{errorMessage}</div> : null}

        <form action={providerLoginAction} className="loginProviderForm">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button type="submit" className="loginProviderButton">
            <IdCard aria-hidden="true" />
            เข้าระบบด้วย ProviderID
          </button>
        </form>

        <div className="loginDivider" aria-hidden="true">
          <span>หรือ</span>
        </div>

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
