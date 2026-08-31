"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAdminShopId, onAdminShopChange } from "@/lib/adminShop";
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

type DeleteRequest = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  partyName?: string | null;
  total: string;
  requestedByName?: string | null;
  createdAt: string;
  business?: { name: string } | null;
};

type ReturnDeleteRequest = {
  id: string;
  creditNoteId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  partyName?: string | null;
  amount: string;
  refundMethod?: string | null;
  reason?: string | null;
  requestedByName?: string | null;
  createdAt: string;
  business?: { name: string } | null;
};

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
  const [deleteReqs, setDeleteReqs] = useState<DeleteRequest[]>([]);
  const [returnDeleteReqs, setReturnDeleteReqs] = useState<ReturnDeleteRequest[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  // Approvals follow the sidebar's selected shop — only that shop's pending
  // requests are shown, so each shop's queue stays separate.
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    setShopId(getAdminShopId());
    return onAdminShopChange(setShopId);
  }, []);

  async function load() {
    const scope = shopId ? `&businessId=${shopId}` : "";
    const [r, d, rd] = await Promise.all([
      api<{ requests: Request[] }>(`/api/admin/change-requests?status=PENDING${scope}`),
      api<{ requests: DeleteRequest[] }>(`/api/admin/delete-requests?status=PENDING${scope}`),
      api<{ requests: ReturnDeleteRequest[] }>(
        `/api/admin/return-delete-requests?status=PENDING${scope}`
      ),
    ]);
    setRequests(r.requests);
    setDeleteReqs(d.requests);
    setReturnDeleteReqs(rd.requests);
  }

  // The selected shop's name for the page title.
  useEffect(() => {
    if (!shopId) {
      setShopName("");
      return;
    }
    api<{ businesses: Array<{ id: string; name: string }> }>("/api/admin/businesses")
      .then((r) => setShopName(r.businesses.find((b) => b.id === shopId)?.name ?? ""))
      .catch(() => setShopName(""));
  }, [shopId]);

  // Returns recorded as an exchange carry "Exchange" in their reason — undoing
  // one also strips the replacement goods off the bill, so flag it clearly.
  const isExchange = (d: ReturnDeleteRequest) =>
    (d.reason ?? "").trim().toLowerCase().startsWith("exchange");

  async function approveReturnDelete(d: ReturnDeleteRequest) {
    if (
      !confirm(
        `Approve deletion of this return (${formatMoneySafe(d.amount)}) on ${
          d.invoiceNumber ?? "the bill"
        }? The items go back to sold, the stock it added is removed, and any cash refund is reversed.${
          isExchange(d)
            ? "\n\nThis was an EXCHANGE: the replacement goods also come off the bill, their stock goes back, and the extra amount collected is undone."
            : ""
        }`
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/admin/return-delete-requests/${d.id}/approve`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectReturnDelete(d: ReturnDeleteRequest) {
    setBusy(true);
    try {
      await api(`/api/admin/return-delete-requests/${d.id}/reject`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveDelete(d: DeleteRequest) {
    if (
      !confirm(
        `Approve deletion of ${d.invoiceNumber} (${formatMoneySafe(d.total)})? Stock will be restored and the bill removed.`
      )
    )
      return;
    await api(`/api/admin/delete-requests/${d.id}/approve`, { method: "POST" });
    await load();
  }

  async function rejectDelete(d: DeleteRequest) {
    await api(`/api/admin/delete-requests/${d.id}/reject`, { method: "POST" });
    await load();
  }

  function formatMoneySafe(v: string | number) {
    const n = Number(v);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(isNaN(n) ? 0 : n);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

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
      <PageHeader
        title={shopName ? `Approvals — ${shopName}` : "Product Edit Approvals"}
      />
      <p className="mb-4 text-sm text-gray-500">
        {shopName ? (
          <>
            Showing pending requests for <b>{shopName}</b> only — switch the shop in
            the sidebar to review another shop&apos;s queue.{" "}
          </>
        ) : null}
        Shops can&apos;t change a product directly — their edits wait here. Review and{" "}
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

      {/* Invoice deletion requests */}
      <h2 className="mb-2 mt-8 text-lg font-bold text-slate-800">Invoice Deletions</h2>
      <p className="mb-4 text-sm text-gray-500">
        Bills a shop wants to delete. <b>Approve</b> removes the bill and restores stock;{" "}
        <b>Reject</b> keeps it.
      </p>
      <div className="card p-0">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Bill</th>
              <th className="table-th">Party</th>
              <th className="table-th">Shop</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Requested by</th>
              <th className="table-th">When</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deleteReqs.map((d) => (
              <tr key={d.id}>
                <td className="table-td">
                  <a
                    href={`/invoices/${d.invoiceId}`}
                    target="_blank"
                    className="font-medium text-brand hover:underline"
                  >
                    {d.invoiceNumber} ↗
                  </a>
                </td>
                <td className="table-td text-gray-500">{d.partyName ?? "—"}</td>
                <td className="table-td text-gray-500">{d.business?.name ?? "—"}</td>
                <td className="table-td text-right font-semibold">
                  {formatMoneySafe(d.total)}
                </td>
                <td className="table-td text-gray-500">{d.requestedByName ?? "—"}</td>
                <td className="table-td text-gray-500">{formatDate(d.createdAt)}</td>
                <td className="table-td text-right">
                  <button
                    onClick={() => approveDelete(d)}
                    disabled={busy}
                    className="mr-3 font-medium text-red-600 hover:underline"
                  >
                    Approve Delete
                  </button>
                  <button
                    onClick={() => rejectDelete(d)}
                    disabled={busy}
                    className="text-gray-500 hover:underline"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {deleteReqs.length === 0 && (
              <tr>
                <td className="table-td text-gray-400" colSpan={7}>
                  No pending invoice deletions. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sales-return deletion requests */}
      <h2 className="mb-2 mt-8 text-lg font-bold text-slate-800">Return Deletions</h2>
      <p className="mb-4 text-sm text-gray-500">
        Wrong returns a shop wants to undo. <b>Approve</b> puts the items back as sold,
        removes the stock the return added, and reverses any cash refund — for an exchange it
        also takes the replacement goods off the bill, puts their stock back and undoes the
        extra amount collected; <b>Reject</b> keeps the return.
      </p>
      <div className="card p-0">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Bill</th>
              <th className="table-th">Party</th>
              <th className="table-th">Shop</th>
              <th className="table-th text-right">Return amount</th>
              <th className="table-th">Refund</th>
              <th className="table-th">Reason</th>
              <th className="table-th">Requested by</th>
              <th className="table-th">When</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returnDeleteReqs.map((d) => (
              <tr key={d.id}>
                <td className="table-td">
                  {d.invoiceId ? (
                    <a
                      href={`/invoices/${d.invoiceId}`}
                      target="_blank"
                      className="font-medium text-brand hover:underline"
                    >
                      {d.invoiceNumber ?? "Bill"} ↗
                    </a>
                  ) : (
                    <span className="font-medium">{d.invoiceNumber ?? "—"}</span>
                  )}
                </td>
                <td className="table-td text-gray-500">{d.partyName ?? "—"}</td>
                <td className="table-td text-gray-500">{d.business?.name ?? "—"}</td>
                <td className="table-td text-right font-semibold">
                  {formatMoneySafe(d.amount)}
                </td>
                <td className="table-td text-gray-500">
                  {d.refundMethod ? d.refundMethod.toLowerCase() : "ledger credit"}
                </td>
                <td className="table-td text-gray-500">
                  {isExchange(d) && (
                    <span className="mr-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-brand">
                      🔄 exchange
                    </span>
                  )}
                  {d.reason || "—"}
                </td>
                <td className="table-td text-gray-500">{d.requestedByName ?? "—"}</td>
                <td className="table-td text-gray-500">{formatDate(d.createdAt)}</td>
                <td className="table-td text-right">
                  <button
                    onClick={() => approveReturnDelete(d)}
                    disabled={busy}
                    className="mr-3 font-medium text-red-600 hover:underline"
                  >
                    Approve Delete
                  </button>
                  <button
                    onClick={() => rejectReturnDelete(d)}
                    disabled={busy}
                    className="text-gray-500 hover:underline"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {returnDeleteReqs.length === 0 && (
              <tr>
                <td className="table-td text-gray-400" colSpan={9}>
                  No pending return deletions. 🎉
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
