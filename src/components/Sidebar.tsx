"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, clearSession } from "@/lib/api";
import AdminShopSwitcher from "@/components/AdminShopSwitcher";

const nav = [
  { href: "/overview", label: "Overview", icon: "📈" },
  { href: "/shops", label: "Shop Details", icon: "🏪" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/approvals", label: "Approvals", icon: "✅" },
  { href: "/shop-logins", label: "Shop Logins", icon: "🔑" },
  { href: "/businesses", label: "Businesses", icon: "🏢" },
  { href: "/users", label: "Users", icon: "👤" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api<{ pendingCount: number }>("/api/admin/change-requests?status=PENDING")
      .then((r) => setPending(r.pendingCount))
      .catch(() => {});
  }, [pathname]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-black text-white shadow-sm">
          L
        </div>
        <div className="leading-tight">
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Laxora
          </span>
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Admin
          </span>
        </div>
      </div>

      <AdminShopSwitcher />

      <p className="px-5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Menu
      </p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-brand-light text-brand shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[15px] transition ${
                  active ? "bg-white/70" : "bg-slate-100 group-hover:bg-white"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.href === "/approvals" && pending > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[15px]">
            ⎋
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
}
