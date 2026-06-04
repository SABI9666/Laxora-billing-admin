"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Tab = "sales" | "pnl" | "customers" | "suppliers" | "analysis";

type SupplierAnalysis = {
  best: { name: string; profit: number; marginPct: number } | null;
  suppliers: {
    id: string;
    name: string;
    purchaseIn: number;
    salesOut: number;
    cogs: number;
    profit: number;
    marginPct: number;
    productCount: number;
  }[];
};

type SalesReport = {
  months: { month: string; count: number; total: number; tax: number }[];
  totals: { total: number; tax: number; count: number };
};
type Pnl = {
  pnl: {
    salesGross: number;
    amountCollected: number;
    outstanding: number;
    returns: number;
    salesNet: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
    expenses: number;
    netProfit: number;
    netMarginPct: number;
    taxCollected: number;
    purchases: number;
    taxPaid: number;
    salesCount: number;
    purchaseCount: number;
  };
  monthly: { month: string; salesNet: number; cogs: number; expenses: number; profit: number }[];
  bills: {
    id: string;
    number: string;
    date: string;
    revenue: number;
    cogs: number;
    expense: number;
    profit: number;
  }[];
};

type BillPnl = {
  bill: {
    invoiceNumber: string;
    date: string;
    party: string;
    shop: string;
    status: string;
  };
  statement: {
    subtotal: number;
    discount: number;
    netSale: number;
    gst: number;
    totalBilled: number;
    amountCollected: number;
    outstanding: number;
    returns: number;
    cogs: number;
    grossProfit: number;
    charges: { category: string; amount: number }[];
    chargesTotal: number;
    netProfit: number;
    netMarginPct: number;
  };
};

// Lightweight vertical bar chart for monthly profit/loss (green = profit, red = loss).
function ProfitChart({ data }: { data: Pnl["monthly"] }) {
  if (!data || data.length === 0)
    return <p className="p-5 text-sm text-gray-400">No data for this period.</p>;
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.profit)));
  return (
    <div className="flex items-end gap-3 overflow-x-auto px-5 py-4" style={{ height: 240 }}>
      {data.map((d) => {
        const h = Math.round((Math.abs(d.profit) / maxAbs) * 150);
        const up = d.profit >= 0;
        return (
          <div key={d.month} className="flex min-w-[48px] flex-1 flex-col items-center">
            <div className="flex h-[180px] w-full flex-col items-center justify-end">
              <span
                className={`mb-1 text-xs font-medium ${up ? "text-green-700" : "text-red-600"}`}
              >
                {formatMoney(d.profit)}
              </span>
              <div
                className={`w-7 rounded-t ${up ? "bg-green-500" : "bg-red-500"}`}
                style={{ height: Math.max(4, h) }}
                title={`${d.month}: ${formatMoney(d.profit)}`}
              />
            </div>
            <span className="mt-2 text-xs text-gray-500">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}
type PartyRow = { id: string; name: string; phone?: string | null; billed: number; paid: number; balance: number };
type Ledger = {
  party: { name: string; type: string; openingBalance: number };
  closingBalance: number;
  ledger: { date: string; kind: string; ref: string; debit: number; credit: number; balance: number }[];
};

const TABS: { key: Tab; label: string }[] = [
  { key: "sales", label: "Sales Report" },
  { key: "pnl", label: "Profit & Loss" },
  { key: "customers", label: "Customer Ledger" },
  { key: "suppliers", label: "Purchase Ledger" },
  { key: "analysis", label: "Supplier Analysis" },
];

export default function ReportsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [billPnl, setBillPnl] = useState<BillPnl | null>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [analysis, setAnalysis] = useState<SupplierAnalysis | null>(null);

  const range = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  useEffect(() => {
    api<{ businesses: Shop[] }>("/api/admin/businesses").then((r) => {
      setShops(r.businesses);
      if (r.businesses[0]) setShopId(r.businesses[0].id);
    });
  }, []);

  async function loadReport() {
    if (!shopId) return;
    setLedger(null);
    if (tab === "sales") {
      setSales(await api(`/api/admin/businesses/${shopId}/sales-report${range()}`));
    } else if (tab === "pnl") {
      setPnl(await api(`/api/admin/businesses/${shopId}/pnl${range()}`));
    } else if (tab === "analysis") {
      setAnalysis(await api(`/api/admin/businesses/${shopId}/suppliers-analysis${range()}`));
    } else {
      const type = tab === "customers" ? "CUSTOMER" : "SUPPLIER";
      const r = await api<{ parties: PartyRow[] }>(
        `/api/admin/businesses/${shopId}/parties?type=${type}`
      );
      setParties(r.parties);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, tab]);

  async function openLedger(partyId: string) {
    setLedger(await api(`/api/admin/parties/${partyId}/ledger`));
  }

  async function openBillPnl(invoiceId: string) {
    setBillPnl(await api(`/api/admin/invoices/${invoiceId}/pnl`));
  }

  const showDates = tab === "sales" || tab === "pnl" || tab === "analysis";

  return (
    <div>
      <PageHeader
        title="Reports"
        action={
          <select
            className="input w-64"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
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

      {/* Report type tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.key ? "bg-brand text-white" : "bg-white text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date selection */}
      {showDates && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={loadReport}>
            Apply
          </button>
          {(from || to) && (
            <button
              className="text-sm text-gray-500 hover:underline"
              onClick={() => {
                setFrom("");
                setTo("");
                setTimeout(loadReport, 0);
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* SALES REPORT */}
      {tab === "sales" && sales && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="card">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(sales.totals.total)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Tax Collected</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(sales.totals.tax)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Bills</p>
              <p className="mt-1 text-2xl font-bold">{sales.totals.count}</p>
            </div>
          </div>
          <div className="card p-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Month</th>
                  <th className="table-th text-right">Bills</th>
                  <th className="table-th text-right">Tax</th>
                  <th className="table-th text-right">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.months.map((m) => (
                  <tr key={m.month}>
                    <td className="table-td font-medium">{m.month}</td>
                    <td className="table-td text-right">{m.count}</td>
                    <td className="table-td text-right">{formatMoney(m.tax)}</td>
                    <td className="table-td text-right">{formatMoney(m.total)}</td>
                  </tr>
                ))}
                {sales.months.length === 0 && (
                  <tr>
                    <td className="table-td text-gray-400" colSpan={4}>
                      No sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* PROFIT & LOSS */}
      {tab === "pnl" && pnl && (
        <>
          {/* Headline profit KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm text-gray-500">Collected (net of tax)</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(pnl.pnl.salesNet)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Cost of goods</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(pnl.pnl.cogs)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Expenses / charges</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatMoney(pnl.pnl.expenses)}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Net Profit</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  pnl.pnl.netProfit >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatMoney(pnl.pnl.netProfit)}
              </p>
            </div>
          </div>

          {/* Monthly profit / loss chart */}
          <div className="card mb-6 p-0">
            <div className="border-b px-5 py-3 font-semibold">
              Monthly Net Profit / Loss
            </div>
            <ProfitChart data={pnl.monthly} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Per-bill profit / loss */}
            <div className="card p-0">
              <div className="border-b px-5 py-3 font-semibold">
                Profit / Loss per Bill{" "}
                <span className="font-normal text-gray-400">(click a bill for full P&amp;L)</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="table-th">Bill</th>
                      <th className="table-th text-right">Revenue</th>
                      <th className="table-th text-right">Cost</th>
                      <th className="table-th text-right">Charges</th>
                      <th className="table-th text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pnl.bills.map((b) => (
                      <tr
                        key={b.number}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openBillPnl(b.id)}
                      >
                        <td className="table-td font-medium text-brand">{b.number}</td>
                        <td className="table-td text-right">{formatMoney(b.revenue)}</td>
                        <td className="table-td text-right">{formatMoney(b.cogs)}</td>
                        <td className="table-td text-right">{formatMoney(b.expense)}</td>
                        <td
                          className={`table-td text-right font-semibold ${
                            b.profit >= 0 ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {formatMoney(b.profit)}
                        </td>
                      </tr>
                    ))}
                    {pnl.bills.length === 0 && (
                      <tr>
                        <td className="table-td text-gray-400" colSpan={5}>
                          No sales bills in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* P&L statement */}
            <div className="card space-y-5">
              <div>
                <div className="font-semibold">P&amp;L Statement</div>
                <p className="text-xs text-gray-400">
                  Cash basis — based on what you actually collected.
                </p>
              </div>

              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Income
                </p>
                <Line label="Amount collected" value={formatMoney(pnl.pnl.amountCollected)} />
                <Line label="GST collected" value={`- ${formatMoney(pnl.pnl.taxCollected)}`} />
                <Line label="Returns" value={`- ${formatMoney(pnl.pnl.returns)}`} />
                <div className="mt-1 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span>Net Sales</span>
                  <span>{formatMoney(pnl.pnl.salesNet)}</span>
                </div>
              </section>

              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Costs
                </p>
                <Line label="Cost of goods sold" value={`- ${formatMoney(pnl.pnl.cogs)}`} />
                <Line
                  label="Gross Profit"
                  value={formatMoney(pnl.pnl.grossProfit)}
                  bold
                  valueClass={pnl.pnl.grossProfit >= 0 ? "text-green-700" : "text-red-600"}
                />
                <Line label="Expenses / charges" value={`- ${formatMoney(pnl.pnl.expenses)}`} />
              </section>

              <section>
                <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
                  <span>Net Profit</span>
                  <span className={pnl.pnl.netProfit >= 0 ? "text-green-700" : "text-red-600"}>
                    {formatMoney(pnl.pnl.netProfit)}
                  </span>
                </div>
                <Line label="Net Margin" value={`${pnl.pnl.netMarginPct}%`} />
              </section>

              <section className="border-t pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  For reference
                </p>
                <Line label="Total billed" value={formatMoney(pnl.pnl.salesGross)} />
                <Line label="Outstanding (to collect)" value={formatMoney(pnl.pnl.outstanding)} />
                <Line label="Total purchases" value={formatMoney(pnl.pnl.purchases)} />
                <Line
                  label="Sales / Purchase bills"
                  value={`${pnl.pnl.salesCount} / ${pnl.pnl.purchaseCount}`}
                />
              </section>
            </div>
          </div>
        </>
      )}

      {/* CUSTOMER / SUPPLIER LEDGER */}
      {(tab === "customers" || tab === "suppliers") && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-0">
            <div className="border-b px-5 py-3 font-semibold">
              {tab === "customers" ? "Customers" : "Suppliers"}
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parties.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openLedger(p.id)}
                  >
                    <td className="table-td font-medium text-brand">{p.name}</td>
                    <td className="table-td text-right">{formatMoney(p.balance)}</td>
                  </tr>
                ))}
                {parties.length === 0 && (
                  <tr>
                    <td className="table-td text-gray-400" colSpan={2}>
                      None yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-0">
            <div className="border-b px-5 py-3 font-semibold">
              {ledger ? `${ledger.party.name} — Ledger` : "Select a name to view ledger"}
            </div>
            {ledger && (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Detail</th>
                      <th className="table-th text-right">Billed</th>
                      <th className="table-th text-right">Paid / Return</th>
                      <th className="table-th text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="table-td text-gray-400" colSpan={4}>
                        Opening balance
                      </td>
                      <td className="table-td text-right">{formatMoney(ledger.party.openingBalance)}</td>
                    </tr>
                    {ledger.ledger.map((e, i) => (
                      <tr key={i}>
                        <td className="table-td">{formatDate(e.date)}</td>
                        <td className="table-td">
                          {e.kind}
                          {e.ref ? ` · ${e.ref}` : ""}
                        </td>
                        <td className="table-td text-right">{e.debit ? formatMoney(e.debit) : "—"}</td>
                        <td className="table-td text-right text-green-700">
                          {e.credit ? formatMoney(e.credit) : "—"}
                        </td>
                        <td className="table-td text-right font-medium">{formatMoney(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t px-5 py-3">
                  <span className="font-semibold">
                    {ledger.closingBalance > 0
                      ? "Balance due from customer"
                      : ledger.closingBalance < 0
                      ? "Advance / we owe customer"
                      : "Settled"}
                  </span>
                  <span
                    className={`font-bold ${
                      ledger.closingBalance > 0
                        ? "text-red-600"
                        : ledger.closingBalance < 0
                        ? "text-green-700"
                        : ""
                    }`}
                  >
                    {formatMoney(Math.abs(ledger.closingBalance))}
                  </span>
                </div>
                <p className="px-5 pb-3 text-xs text-gray-400">
                  "Billed" adds to what they owe; "Paid / Return" reduces it. A balance due means
                  the customer still owes you.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUPPLIER ANALYSIS */}
      {tab === "analysis" && analysis && (
        <>
          {analysis.best && (
            <div className="card mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-gray-500">🏆 Best-performing supplier</span>
              <span className="font-semibold">
                {analysis.best.name} · profit {formatMoney(analysis.best.profit)} ·{" "}
                {analysis.best.marginPct}% margin
              </span>
            </div>
          )}
          <div className="card p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Supplier</th>
                    <th className="table-th text-right">Purchased (In)</th>
                    <th className="table-th text-right">Sold (Out)</th>
                    <th className="table-th text-right">Cost</th>
                    <th className="table-th text-right">Profit</th>
                    <th className="table-th text-right">Margin</th>
                    <th className="table-th text-right">Products</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analysis.suppliers.map((s) => {
                    // Slow supplier: bought a lot but sold little.
                    const slow = s.purchaseIn > 0 && s.salesOut < s.purchaseIn * 0.5;
                    return (
                      <tr key={s.id}>
                        <td className="table-td font-medium">
                          {s.name}
                          {slow && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                              high in / low out
                            </span>
                          )}
                        </td>
                        <td className="table-td text-right">{formatMoney(s.purchaseIn)}</td>
                        <td className="table-td text-right">{formatMoney(s.salesOut)}</td>
                        <td className="table-td text-right">{formatMoney(s.cogs)}</td>
                        <td
                          className={`table-td text-right font-semibold ${
                            s.profit >= 0 ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {formatMoney(s.profit)}
                        </td>
                        <td className="table-td text-right">{s.marginPct}%</td>
                        <td className="table-td text-right">{s.productCount}</td>
                      </tr>
                    );
                  })}
                  {analysis.suppliers.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={7}>
                        No suppliers yet. Add suppliers and link them to products to see this.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-gray-400">
              <b>In</b> = total you purchased from the supplier. <b>Out</b> = sales of their
              products. <b>Profit</b> = sales of their products − their cost. Sorted best-first.
              "High in / low out" flags suppliers you bought a lot from but sold little.
            </p>
          </div>
        </>
      )}

      {/* Per-bill P&L statement modal */}
      {billPnl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBillPnl(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  P&amp;L — {billPnl.bill.invoiceNumber}
                </h2>
                <p className="text-xs text-gray-500">
                  {billPnl.bill.party} · {billPnl.bill.shop} · {billPnl.bill.status}
                </p>
              </div>
              <button
                onClick={() => setBillPnl(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              {/* 1. Bill amount */}
              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Bill Amount
                </p>
                <Line label="Subtotal (ex-GST)" value={formatMoney(billPnl.statement.subtotal)} />
                <Line label="Discount" value={`- ${formatMoney(billPnl.statement.discount)}`} />
                <Line label="GST" value={`+ ${formatMoney(billPnl.statement.gst)}`} />
                <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-bold">
                  <span>Total Bill (incl GST)</span>
                  <span>{formatMoney(billPnl.statement.totalBilled)}</span>
                </div>
              </section>

              {/* 2. Payment */}
              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Payment
                </p>
                <Line label="Collected" value={formatMoney(billPnl.statement.amountCollected)} />
                <Line
                  label="Returned (credit note)"
                  value={formatMoney(billPnl.statement.returns)}
                />
                <Line
                  label="Outstanding (to collect)"
                  value={formatMoney(billPnl.statement.outstanding)}
                  valueClass={billPnl.statement.outstanding > 0 ? "text-red-600 font-semibold" : ""}
                />
              </section>

              {/* 3. Profit */}
              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Profit on this Bill
                </p>
                <Line label="Net sale (ex-GST)" value={formatMoney(billPnl.statement.netSale)} />
                <Line
                  label="Cost of goods"
                  value={`- ${formatMoney(billPnl.statement.cogs)}`}
                />
                <Line
                  label="Gross Profit"
                  value={formatMoney(billPnl.statement.grossProfit)}
                  bold
                />
                {billPnl.statement.charges.map((c) => (
                  <Line key={c.category} label={c.category} value={`- ${formatMoney(c.amount)}`} />
                ))}
                {billPnl.statement.charges.length === 0 && (
                  <Line label="Charges" value={`- ${formatMoney(0)}`} />
                )}
                <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-bold">
                  <span>Net Profit</span>
                  <span
                    className={
                      billPnl.statement.netProfit >= 0 ? "text-green-700" : "text-red-600"
                    }
                  >
                    {formatMoney(billPnl.statement.netProfit)}
                  </span>
                </div>
                <Line label="Net Margin" value={`${billPnl.statement.netMarginPct}%`} />
              </section>

              <p className="text-xs text-gray-400">
                GST is collected for the government (not profit). Returns and charges
                (commission/damage) linked to this bill are already included above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  bold,
  valueClass = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={bold ? "font-semibold text-gray-800" : "text-gray-500"}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${valueClass}`}>{value}</span>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className="py-1.5 text-gray-600">{label}</td>
      <td className="py-1.5 text-right">{value}</td>
    </tr>
  );
}
