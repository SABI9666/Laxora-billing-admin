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
  franchise?: { id: string; name: string } | null;
  // memberships = logins that can open this shop. Zero means nobody can
  // select it in the shop app, however healthy it looks here.
  _count: { invoices: number; parties: number; items: number; memberships: number };
};
type Franchise = { id: string; name: string };

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [search, setSearch] = useState("");
  const [reconciling, setReconciling] = useState(false);

  // Spreads receipts that were saved without a bill across each party's open
  // bills, so the ledger and the pending list agree. The API runs the same
  // pass on every start; this is for doing it right now.
  async function reconcilePayments() {
    if (
      !confirm(
        "Allocate every receipt / supplier payment that has no bill to that party's " +
          "pending bills (oldest first)? Bills the money covers become Paid / Partial. " +
          "Safe to run again."
      )
    )
      return;
    setReconciling(true);
    try {
      const r = await api<{ allocated: number; rechecked: number }>(
        "/api/admin/reconcile-payments",
        { method: "POST" }
      );
      alert(
        r.allocated > 0
          ? `${r.allocated} voucher(s) allocated to bills; ${r.rechecked} partial bill(s) rechecked.`
          : `Nothing to allocate — every receipt is already on a bill. ${r.rechecked} partial bill(s) rechecked.`
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reconcile failed");
    } finally {
      setReconciling(false);
    }
  }

  async function load() {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await api<{ businesses: Business[] }>(`/api/admin/businesses${q}`);
    setBusinesses(r.businesses);
  }
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    api<{ franchises: Franchise[] }>("/api/admin/franchises")
      .then((r) => setFranchises(r.franchises))
      .catch(() => setFranchises([]));
  }, []);

  // Attach/detach a shop to a franchise. External stock transfers only list
  // shops of the SAME franchise, so a standalone shop never shows up as a
  // destination until it is attached here.
  async function setFranchise(b: Business, franchiseId: string) {
    await api(`/api/admin/businesses/${b.id}/franchise`, {
      method: "PATCH",
      body: { franchiseId: franchiseId || null },
    });
    await load();
  }

  async function remove(b: Business) {
    if (!confirm(`Delete "${b.name}" and ALL its data? This cannot be undone.`))
      return;
    await api(`/api/admin/businesses/${b.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Businesses"
        action={
          <button
            onClick={reconcilePayments}
            disabled={reconciling}
            className="btn-secondary"
            title="Allocate receipts saved without a bill to the party's pending bills"
          >
            {reconciling ? "Reconciling…" : "Reconcile payments"}
          </button>
        }
      />
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
                <th className="table-th">Shop</th>
                <th className="table-th">Franchise</th>
                <th className="table-th">Owner</th>
                <th className="table-th text-right">Logins</th>
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
                    {franchises.length > 0 ? (
                      <select
                        className="input w-44 py-1 text-sm"
                        value={b.franchise?.id ?? ""}
                        onChange={(e) => setFranchise(b, e.target.value)}
                      >
                        <option value="">Standalone</option>
                        {franchises.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : b.franchise ? (
                      b.franchise.name
                    ) : (
                      <span className="text-xs text-gray-400">Standalone</span>
                    )}
                  </td>
                  <td className="table-td">
                    <div>{b.owner?.name}</div>
                    <div className="text-xs text-gray-400">{b.owner?.email}</div>
                  </td>
                  <td className="table-td text-right">
                    {b._count.memberships > 0 ? (
                      b._count.memberships
                    ) : (
                      <span
                        className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
                        title="No login can open this shop, so it never shows in the shop switcher. Attach one in Shop Logins."
                      >
                        ⚠ none
                      </span>
                    )}
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
                  <td className="table-td text-gray-400" colSpan={10}>
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
