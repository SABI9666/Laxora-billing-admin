"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Request = {
  id: string;
  itemName: string;
  changes: Record<string, any>;
  requestedByName?: string | null;
  createdAt: string;
  business?: { name: string } | null;
};
type Detail = { request: Request; item: Record<string, any> | null };

// Friendly labels for the product fields.
const LABELS: Record<string, string> = {
  name: "Name",
  categoryId: "Category",
  supplierId: "Supplier",
  sku: "SKU",
  barcode: "Barcode",
  brand: "Brand",
  wattage: "Wattage / Model",
  hsn: "HSN",
  unit: "Unit",
  salePrice: "Sale Price",
  purchasePrice: "Purchase Price",
  taxRate: "Tax %",
  stockQty: "Stock Qty",
  lowStockAlert: "Low Stock Alert",
  isService: "Is Service",
};

const show = (v: any) =>
  v === null || v === undefined || v === "" ? "—" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api<{ requests: Request[] }>("/api/admin/change-requests?status=PENDING");
    setRequests(r.requests);
  }
  useEffect(() => {
    load();
  }, []);

  async function open(id: string) {
    setDetail(await api<Detail>(`/api/admin/change-requests/${id}`));
  }

  async function approve() {
    if (!detail) return;
    setBusy(true);
    try {
      await api(`/api/admin/change-requests/${detail.request.id}/approve`, { method: "POST" });
      setDetail(null);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!detail) return;
    if (!confirm("Reject this change? The product will stay as it is.")) return;
    setBusy(true);
    try {
      await api(`/api/admin/change-requests/${detail.request.id}/reject`, { method: "DELETE" });
      setDetail(null);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // The fields that actually changed (proposed vs current).
  const changedKeys = detail
    ? Object.keys(detail.request.changes).filter(
        (k) =>
          LABELS[k] &&
          String(detail.request.changes[k] ?? "") !== String(detail.item?.[k] ?? "")
      )
    : [];

  return (
    <div>
      <PageHeader title="Product Edit Approvals" />
      <p className="mb-4 text-sm text-gray-500">
        Shops can't change a product directly — their edits wait here. Review and{" "}
        <b>approve</b> to apply, or <b>reject</b> to discard.
      </p>

      <div className="card p-0">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Product</th>
              <th className="table-th">Shop</th>
              <th className="table-th">Requested by</th>
              <th className="table-th">When</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="table-td font-medium">{r.itemName}</td>
                <td className="table-td text-gray-500">{r.business?.name ?? "—"}</td>
                <td className="table-td text-gray-500">{r.requestedByName ?? "—"}</td>
                <td className="table-td text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="table-td text-right">
                  <button onClick={() => open(r.id)} className="font-medium text-brand hover:underline">
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="table-td text-gray-400" colSpan={5}>
                  No pending product edits. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Review change — {detail.request.itemName}</h2>
                <p className="text-xs text-gray-500">
                  {detail.request.business?.name} · by {detail.request.requestedByName ?? "—"}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400">
                    <th className="pb-2">Field</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">Proposed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {changedKeys.map((k) => (
                    <tr key={k}>
                      <td className="py-2 font-medium">{LABELS[k]}</td>
                      <td className="py-2 text-gray-500">{show(detail.item?.[k])}</td>
                      <td className="py-2 font-semibold text-brand">
                        {show(detail.request.changes[k])}
                      </td>
                    </tr>
                  ))}
                  {changedKeys.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-gray-400">
                        No effective changes (values are the same).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 border-t px-5 py-4">
              <button onClick={reject} disabled={busy} className="btn-secondary text-red-600">
                Reject
              </button>
              <button onClick={approve} disabled={busy} className="btn-primary">
                {busy ? "…" : "Approve & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
