"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAdminShopId, onAdminShopChange } from "@/lib/adminShop";
import { formatMoney } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type PlatformStats = {
  users: number;
  businesses: number;
  franchises: number;
  invoices: number;
  parties: number;
  totalSalesVolume: number;
};

type ShopStats = {
  invoices: number;
  parties: number;
  items: number;
  logins: number;
  totalSalesVolume: number;
};
type ShopStatsResponse = {
  shop: { id: string; name: string; code?: string | null };
  stats: ShopStats;
};

// Overview follows the sidebar's selected shop: the numbers are that shop's
// alone. A small strip below keeps the platform-wide totals for context.
export default function OverviewPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopData, setShopData] = useState<ShopStatsResponse | null>(null);
  const [platform, setPlatform] = useState<PlatformStats | null>(null);

  useEffect(() => {
    setShopId(getAdminShopId());
    api<{ stats: PlatformStats }>("/api/admin/stats").then((r) =>
      setPlatform(r.stats)
    );
    return onAdminShopChange(setShopId);
  }, []);

  useEffect(() => {
    if (!shopId) {
      setShopData(null);
      return;
    }
    api<ShopStatsResponse>(`/api/admin/stats?businessId=${shopId}`)
      .then(setShopData)
      .catch(() => setShopData(null));
  }, [shopId]);

  const shopCards = [
    { label: "Total Sales Volume", value: shopData && formatMoney(shopData.stats.totalSalesVolume), wide: true },
    { label: "Invoices", value: shopData?.stats.invoices },
    { label: "Products", value: shopData?.stats.items },
    { label: "Customers / Suppliers", value: shopData?.stats.parties },
    { label: "Logins", value: shopData?.stats.logins },
  ];

  const platformCards = [
    { label: "Franchises", value: platform?.franchises },
    { label: "Shops / Businesses", value: platform?.businesses },
    { label: "Users", value: platform?.users },
    { label: "Invoices", value: platform?.invoices },
    { label: "Parties", value: platform?.parties },
    {
      label: "Total Sales Volume",
      value: platform && formatMoney(platform.totalSalesVolume),
    },
  ];

  return (
    <div>
      <PageHeader
        title={shopData ? `Overview — ${shopData.shop.name}` : "Overview"}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shopCards.map((c) => (
          <div key={c.label} className={`card ${c.wide ? "lg:col-span-2" : ""}`}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {c.value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-10 text-sm font-bold uppercase tracking-wide text-slate-400">
        All shops combined (platform)
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {platformCards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {c.value ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
