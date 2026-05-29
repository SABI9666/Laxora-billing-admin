"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Stats = {
  users: number;
  businesses: number;
  invoices: number;
  parties: number;
  totalSalesVolume: number;
};

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<{ stats: Stats }>("/api/admin/stats").then((r) => setStats(r.stats));
  }, []);

  const cards = [
    { label: "Businesses", value: stats?.businesses },
    { label: "Users", value: stats?.users },
    { label: "Invoices", value: stats?.invoices },
    { label: "Parties", value: stats?.parties },
    {
      label: "Total Sales Volume",
      value: stats && formatMoney(stats.totalSalesVolume),
      wide: true,
    },
  ];

  return (
    <div>
      <PageHeader title="Platform Overview" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`card ${c.wide ? "lg:col-span-2" : ""}`}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {c.value ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
