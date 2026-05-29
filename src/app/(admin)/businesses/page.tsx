"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Business = {
  id: string;
  name: string;
  gstin?: string;
  createdAt: string;
  owner: { name: string; email: string };
  _count: { invoices: number; parties: number; items: number };
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await api<{ businesses: Business[] }>(`/api/admin/businesses${q}`);
    setBusinesses(r.businesses);
  }
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function remove(b: Business) {
    if (!confirm(`Delete "${b.name}" and ALL its data? This cannot be undone.`))
      return;
    await api(`/api/admin/businesses/${b.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Businesses" />
      <input
        className="input mb-4 max-w-sm"
        placeholder="Search businesses…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Business</th>
                <th className="table-th">Owner</th>
                <th className="table-th">GSTIN</th>
                <th className="table-th text-right">Invoices</th>
                <th className="table-th text-right">Parties</th>
                <th className="table-th text-right">Items</th>
                <th className="table-th">Created</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td className="table-td font-medium">{b.name}</td>
                  <td className="table-td">
                    <div>{b.owner?.name}</div>
                    <div className="text-xs text-gray-400">{b.owner?.email}</div>
                  </td>
                  <td className="table-td">{b.gstin || "—"}</td>
                  <td className="table-td text-right">{b._count.invoices}</td>
                  <td className="table-td text-right">{b._count.parties}</td>
                  <td className="table-td text-right">{b._count.items}</td>
                  <td className="table-td">{formatDate(b.createdAt)}</td>
                  <td className="table-td text-right">
                    <button
                      onClick={() => remove(b)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td className="table-td text-gray-400" colSpan={8}>
                    No businesses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
