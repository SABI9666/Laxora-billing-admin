"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Details = {
  business: {
    id: string;
    name: string;
    code?: string | null;
    gstin?: string | null;
    phone?: string | null;
    address?: string | null;
    owner?: { name: string; email: string } | null;
    franchise?: { id: string; name: string } | null;
  };
  kpis: {
    totalSales: number;
    salesCount: number;
    totalPurchases: number;
    purchaseCount: number;
    totalReceivable: number;
    partyCount: number;
    itemCount: number;
    lowStockCount: number;
    stockValue: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    type: string;
    total: string;
    status: string;
    createdAt: string;
    party?: { name: string } | null;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    stockQty: string;
    lowStockAlert: string;
  }>;
};

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selected, setSelected] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ businesses: Shop[] }>("/api/admin/businesses").then((r) => {
      setShops(r.businesses);
      if (r.businesses[0]) setSelected(r.businesses[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api<Details>(`/api/admin/businesses/${selected}/details`)
      .then(setDetails)
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div>
      <PageHeader
        title="Shop Details"
        action={
          <select
            className="input w-64"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.code ? ` (${s.code})` : ""}
              </option>
            ))}
          </select>
        }
      />

      {loading && <p className="text-gray-400">Loading…</p>}

      {details && !loading && (
        <>
          {/* Shop header */}
          <div className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{details.business.name}</h2>
                <p className="text-sm text-gray-500">
                  {details.business.franchise
                    ? `Franchise: ${details.business.franchise.name}`
                    : "Standalone shop"}
                  {details.business.gstin ? ` · GSTIN ${details.business.gstin}` : ""}
                </p>
              </div>
              {details.business.owner && (
                <div className="text-right text-sm">
                  <div className="text-gray-700">{details.business.owner.name}</div>
                  <div className="text-gray-400">{details.business.owner.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Total Sales" value={formatMoney(details.kpis.totalSales)} />
            <Kpi label="Total Purchases" value={formatMoney(details.kpis.totalPurchases)} />
            <Kpi label="Receivables" value={formatMoney(details.kpis.totalReceivable)} />
            <Kpi label="Stock Value" value={formatMoney(details.kpis.stockValue)} />
            <Kpi label="Bills" value={String(details.kpis.salesCount)} />
            <Kpi label="Products" value={String(details.kpis.itemCount)} />
            <Kpi label="Customers/Suppliers" value={String(details.kpis.partyCount)} />
            <Kpi label="Low-stock items" value={String(details.kpis.lowStockCount)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent invoices */}
            <div className="card p-0">
              <div className="border-b px-5 py-3 font-semibold">Recent Invoices</div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">No.</th>
                    <th className="table-th">Party</th>
                    <th className="table-th">Type</th>
                    <th className="table-th text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {details.recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="table-td">
                        <Link
                          href={`/invoices/${inv.id}`}
                          target="_blank"
                          className="font-medium text-brand hover:underline"
                        >
                          {inv.invoiceNumber} ↗
                        </Link>
                      </td>
                      <td className="table-td">{inv.party?.name ?? "—"}</td>
                      <td className="table-td">{inv.type}</td>
                      <td className="table-td text-right">{formatMoney(inv.total)}</td>
                    </tr>
                  ))}
                  {details.recentInvoices.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={4}>
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Low stock */}
            <div className="card p-0">
              <div className="border-b px-5 py-3 font-semibold">
                Low Stock ({details.lowStockItems.length})
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Reorder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {details.lowStockItems.map((it) => (
                    <tr key={it.id}>
                      <td className="table-td font-medium">{it.name}</td>
                      <td className="table-td text-right font-semibold text-red-600">
                        {Number(it.stockQty)} {it.unit}
                      </td>
                      <td className="table-td text-right">{Number(it.lowStockAlert)}</td>
                    </tr>
                  ))}
                  {details.lowStockItems.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={3}>
                        Everything above reorder level. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
