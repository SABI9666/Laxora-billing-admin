"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAdminShopId, setAdminShopId, onAdminShopChange } from "@/lib/adminShop";

type Shop = { id: string; name: string; code?: string | null };

// One dropdown in the sidebar to pick the active shop for the whole admin —
// every shop-scoped page (Reports, Shop Details, Shop Logins) follows it.
export default function AdminShopSwitcher() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    api<{ businesses: Shop[] }>("/api/admin/businesses")
      .then((r) => {
        setShops(r.businesses);
        const stored = getAdminShopId();
        const initial =
          r.businesses.find((b) => b.id === stored)?.id ?? r.businesses[0]?.id ?? "";
        if (initial) {
          setActive(initial);
          setAdminShopId(initial);
        }
      })
      .catch(() => {});
    return onAdminShopChange(setActive);
  }, []);

  if (shops.length === 0) return null;

  return (
    <div className="px-4 pb-2">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Shop
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
        <span className="text-base">🏪</span>
        <select
          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
          value={active}
          onChange={(e) => {
            setActive(e.target.value);
            setAdminShopId(e.target.value);
          }}
        >
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.code ? ` (${s.code})` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
