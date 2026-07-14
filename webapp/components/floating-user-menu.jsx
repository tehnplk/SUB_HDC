"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, ChevronUp, Database, LayoutGrid, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { href: "/dev/tranforms-data-dict", label: "Transform Dict", icon: Database },
];

export default function FloatingUserMenu({ userName, userFullname, userAvatarInitial, providerId, userRole, userRoleNote, hoscode, hospitalName, isAdmin, centerName, variant = "floating" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (pathname === "/login") return null;

  const displayName = userFullname || userName || providerId || "Guest";
  const initials = userAvatarInitial?.trim().slice(0, 1) || displayName.trim().slice(0, 1).toUpperCase() || "U";
  const isAuthenticated = Boolean(userFullname || userName || providerId);
  const hospitalLabel = [hoscode, hospitalName].filter(Boolean).join(" · ") || centerName || "SUB HDC";

  async function handleSignOut() {
    setOpen(false);
    await signOut({ redirect: false, callbackUrl: "/login" });
    window.location.assign("/login");
  }

  return (
    <div ref={menuRef} className={`floatingUser ${variant === "header" ? "floatingUserHeader" : ""} ${open ? "floatingUserOpen" : ""}`}>
      {open ? (
        <div className="floatingUserMenu" role="menu" aria-label="User menu">
          {!isAuthenticated ? (
            <Link href="/login" className="floatingUserLink" role="menuitem" onClick={() => setOpen(false)}>
              <LogIn />
              <span>Login</span>
            </Link>
          ) : (
            <>
          <div className="floatingUserCard" role="menuitem" aria-label="Profile">
            <span className={`floatingUserMiniAvatar ${isAuthenticated ? "" : "floatingUserMiniAvatarGuest"}`}>{initials}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{hospitalLabel}</small>
              {userRole ? <small className="floatingUserRole">{userRole}{userRoleNote ? ` · ${userRoleNote}` : ""}</small> : null}
            </span>
          </div>

          <div className="floatingUserLinks">
            {[...menuItems, ...(isAdmin ? [{ href: "/admin", label: "Manage users", icon: ShieldCheck }, { href: "/admin/addon", label: "จัดการระบบ Add-On", icon: LayoutGrid }] : [])].map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`floatingUserLink ${active ? "floatingUserLinkActive" : ""}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className="floatingUserAction"
            onClick={handleSignOut}
            role="menuitem"
          >
            <LogOut />
            <span>Logout</span>
          </button>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="floatingUserButton"
        aria-label={open ? "Collapse user menu" : "Expand user menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`floatingUserAvatar ${isAuthenticated ? "" : "floatingUserAvatarGuest"}`}>
          {isAuthenticated ? <span className="floatingUserButtonInitial">{initials}</span> : <UserRound />}
        </span>
        {open ? <ChevronDown className="floatingUserChevron" /> : <ChevronUp className="floatingUserChevron" />}
      </button>
    </div>
  );
}
