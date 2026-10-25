"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

const LINKS = {
  HOST: [
    ["/dashboard", "Dashboard"],
    ["/search", "Find a Sidekick"],
    ["/calendar", "Calendar"],
    ["/jobs", "Jobs"],
    ["/messages", "Messages"],
    ["/wanted", "My Ads"],
    ["/properties", "Properties"],
  ],
  SIDEKICK: [
    ["/dashboard", "Dashboard"],
    ["/calendar", "Calendar"],
    ["/jobs", "Jobs"],
    ["/wanted", "Wanted Ads"],
    ["/messages", "Messages"],
    ["/availability", "Availability"],
    ["/profile", "Profile"],
  ],
  ADMIN: [
    ["/admin", "Overview"],
    ["/admin/users", "Users"],
    ["/admin/catalog", "Catalog"],
    ["/admin/jobs", "Jobs"],
    ["/admin/ads", "Ads"],
    ["/admin/settings", "Fees & Settings"],
  ],
} as const;

export function Nav() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = user ? LINKS[user.role] : [];
  return (
    <header className="sticky top-0 z-30 bg-navy-900 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
        <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/"} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="h-9 w-9" />
          <span className="text-lg font-black italic tracking-tight">
            <span className="text-flame-500">VR</span>
            <span className="text-white">SIDEKICK</span>
          </span>
        </Link>
        <nav className="ml-4 hidden flex-1 gap-1 lg:flex">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                path === href || (href !== "/admin" && path.startsWith(href + "/"))
                  ? "bg-white/15 text-gold-300"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/account/payments" className="hidden text-sm text-white/80 hover:text-white sm:block">
                {user.name.split(" ")[0]}
              </Link>
              <button onClick={logout} className="hidden rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 sm:block">
                Sign out
              </button>
              <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
                ☰
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-white/90 hover:bg-white/10">
                Sign in
              </Link>
              <Link href="/register" className="btn-accent">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
      {open && user && (
        <nav className="border-t border-white/10 px-4 pb-3 lg:hidden">
          {[...links, ["/account/payments", "Payments"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block py-2 text-sm text-white/90">
              {label}
            </Link>
          ))}
          <button onClick={logout} className="py-2 text-sm text-gold-300">
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
