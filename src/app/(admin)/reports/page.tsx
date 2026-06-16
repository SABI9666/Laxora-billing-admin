"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Tab =
  | "sales"
  | "pnl"
  | "customers"
  | "suppliers"
  | "analysis"
  | "stock"
  | "cashbook";

type StockItem = {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  onHand: number;
  inQty: number;
  outQty: number;
  inValue: number;
  outValue: number;
  value: number;
  firstIn: string | null;
  lastIn: string | null;
  lastOut: string | null;
  ageDays: number | null;
  stockedDays: number | null;
  daysCover: number | null;
  velocity: number;
  low: boolean;
  idle: boolean;
};

type StockReport = {
  shop: string;
  asOf: string;
  totals: {
    products: number;
    stockValue: number;
    inQty: number;
    outQty: number;
    inValue: number;
    outValue: number;
    lowStock: number;
    idle: number;
  };
  fastMoving: StockItem[];
  slowMoving: StockItem[];
  items: StockItem[];
};

type ItemMovements = {
  item: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    brand?: string | null;
    stockQty: number;
    purchasePrice: number;
    salePrice: number;
    shop: string;
    supplier?: string | null;
  };
  summary: { inQty: number; outQty: number; count: number };
  movements: {
    id: string;
    type: string;
    quantity: number;
    balanceAfter: number;
    reason?: string | null;
    reference?: string | null;
    invoiceId?: string | null;
    date: string;
  }[];
};

type CashBook = {
  openingCash: number;
  openingBank: number;
  cashBalance: number;
  bankBalance: number;
  toReceive: number;
  toPay: number;
  days: {
    day: string;
    credit: number;
    debit: number;
    inCash: number;
    inBank: number;
    outCash: number;
    outBank: number;
    cashBalance: number;
    bankBalance: number;
  }[];
  receivables: { id: string; number: string; party: string; date: string; total: number; paid: number; due: number }[];
  payables: { id: string; number: string; party: string; date: string; total: number; paid: number; due: number }[];
};

type Voucher = {
  id: string;
  direction: "IN" | "OUT";
  purpose?: string | null;
  amount: string;
  method: string;
  paymentDate: string;
  notes?: string | null;
  party?: { name: string } | null;
  invoice?: { invoiceNumber: string } | null;
};

type SupplierAnalysis = {
  best: { name: string; profit: number; marginPct: number } | null;
  fastest: { name: string; unitsOut: number; salesOut: number } | null;
  mostIdle: { name: string; idleValue: number; idleCount: number } | null;
  cashFlow: {
    purchased: number;
    paid: number;
    stockValue: number;
    idleValue: number;
    payableDelta: number;
  };
  suppliers: {
    id: string;
    name: string;
    purchaseIn: number;
    paidInPeriod: number;
    payableDelta: number;
    salesOut: number;
    cogs: number;
    profit: number;
    marginPct: number;
    unitsIn: number;
    unitsOut: number;
    idleValue: number;
    idleCount: number;
    productCount: number;
    stockValue: number;
  }[];
};

type SupplierStock = {
  supplier: { id: string; name: string };
  asOf: string | null;
  totalValue: number;
  items: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
    stockQty: number;
    stockIn: number;
    stockOut: number;
    purchasePrice: number;
    salePrice: number;
    low: boolean;
    value: number;
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
  party: { id: string; name: string; type: string; openingBalance: number };
  closingBalance: number;
  ledger: { date: string; kind: string; ref: string; debit: number; credit: number; balance: number }[];
};

// Human-friendly labels for the stock ledger's movement types.
const MOVE_LABELS: Record<string, string> = {
  IN: "Stock In",
  OUT: "Sale / Issue",
  ADJUST: "Adjustment",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

const TABS: { key: Tab; label: string }[] = [
  { key: "sales", label: "Sales Report" },
  { key: "pnl", label: "Profit & Loss" },
  { key: "customers", label: "Customer Ledger" },
  { key: "suppliers", label: "Purchase Ledger" },
  { key: "analysis", label: "Supplier Analysis" },
  { key: "stock", label: "Stock Movement" },
  { key: "cashbook", label: "Cash Book" },
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
  const [supplierStock, setSupplierStock] = useState<SupplierStock | null>(null);
  const [cashbook, setCashbook] = useState<CashBook | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stock, setStock] = useState<StockReport | null>(null);
  const [itemMoves, setItemMoves] = useState<ItemMovements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which bill list popup is open from the cash book KPIs.
  const [billsView, setBillsView] = useState<"receivables" | "payables" | null>(null);

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
    setError(null);
    setLoading(true);
    try {
      if (tab === "sales") {
        setSales(await api(`/api/admin/businesses/${shopId}/sales-report${range()}`));
      } else if (tab === "pnl") {
        setPnl(await api(`/api/admin/businesses/${shopId}/pnl${range()}`));
      } else if (tab === "analysis") {
        setAnalysis(await api(`/api/admin/businesses/${shopId}/suppliers-analysis${range()}`));
      } else if (tab === "stock") {
        setStock(await api(`/api/admin/businesses/${shopId}/stock-movement${range()}`));
      } else if (tab === "cashbook") {
        const [cb, v] = await Promise.all([
          api<CashBook>(`/api/admin/businesses/${shopId}/cashbook${range()}`),
          api<{ payments: Voucher[] }>(`/api/admin/businesses/${shopId}/vouchers${range()}`),
        ]);
        setCashbook(cb);
        setVouchers(v.payments);
      } else {
        const type = tab === "customers" ? "CUSTOMER" : "SUPPLIER";
        const r = await api<{ parties: PartyRow[] }>(
          `/api/admin/businesses/${shopId}/parties?type=${type}`
        );
        setParties(r.parties);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load this report.";
      setError(
        msg === "Not Found" || /not found|404/i.test(msg)
          ? "This report isn't available yet — the backend API may need to be redeployed with the latest update."
          : msg
      );
    } finally {
      setLoading(false);
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

  async function openSupplierStock(partyId: string) {
    setSupplierStock(await api(`/api/admin/parties/${partyId}/stock${range()}`));
  }

  async function openItemMovements(itemId: string) {
    setItemMoves(await api(`/api/admin/items/${itemId}/movements${range()}`));
  }

  const [backfilling, setBackfilling] = useState(false);
  async function backfillEntryDates() {
    if (
      !confirm(
        "Set today's entry date for all existing products that don't have one yet? " +
          "Products added later keep their real entry date. This is safe to run again."
      )
    )
      return;
    setBackfilling(true);
    try {
      const r = await api<{ backfilled: number }>(
        "/api/admin/stock/backfill-entry-dates",
        { method: "POST" }
      );
      await loadReport();
      alert(
        r.backfilled > 0
          ? `Entry date set to today for ${r.backfilled} product(s).`
          : "All products already have an entry date — nothing to update."
      );
    } finally {
      setBackfilling(false);
    }
  }

  const showDates =
    tab === "sales" ||
    tab === "pnl" ||
    tab === "analysis" ||
    tab === "stock" ||
    tab === "cashbook";

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

      {/* Loading / error feedback so the page is never silently blank */}
      {loading && (
        <div className="card text-sm text-gray-500">Loading report…</div>
      )}
      {!loading && error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">
          {error}
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
            <div className="flex items-center justify-between border-b px-5 py-3 font-semibold">
              <span>{ledger ? `${ledger.party.name} — Ledger` : "Select a name to view ledger"}</span>
              {ledger && (
                <Link
                  href={`/ledger/${ledger.party.id}`}
                  target="_blank"
                  className="text-sm font-medium text-brand hover:underline"
                >
                  🖨️ Print / PDF
                </Link>
              )}
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
          {/* Smart highlights: who performs, who moves fast, whose stock is dead */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <p className="text-sm text-gray-500">🏆 Best-performing supplier</p>
              {analysis.best ? (
                <>
                  <p className="mt-1 text-lg font-bold">{analysis.best.name}</p>
                  <p className="text-xs text-gray-400">
                    profit {formatMoney(analysis.best.profit)} · {analysis.best.marginPct}% margin
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">No profit data yet.</p>
              )}
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">⚡ Fastest-moving supplier</p>
              {analysis.fastest ? (
                <>
                  <p className="mt-1 text-lg font-bold">{analysis.fastest.name}</p>
                  <p className="text-xs text-gray-400">
                    {analysis.fastest.unitsOut} units sold · {formatMoney(analysis.fastest.salesOut)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">No movement this period.</p>
              )}
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">🐌 Most idle stock (supplier)</p>
              {analysis.mostIdle ? (
                <>
                  <p className="mt-1 text-lg font-bold">{analysis.mostIdle.name}</p>
                  <p className="text-xs text-amber-600">
                    {formatMoney(analysis.mostIdle.idleValue)} unsold ·{" "}
                    {analysis.mostIdle.idleCount} products
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">No idle stock 🎉</p>
              )}
            </div>
          </div>

          {/* Cash flow with suppliers this period */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm text-gray-500">🛒 Purchased</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(analysis.cashFlow.purchased)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">💸 Paid to suppliers</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatMoney(analysis.cashFlow.paid)}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">🧾 Added to payable</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  analysis.cashFlow.payableDelta > 0 ? "text-amber-700" : "text-green-700"
                }`}
              >
                {formatMoney(analysis.cashFlow.payableDelta)}
              </p>
              <p className="text-xs text-gray-400">purchased − paid</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">📦 Idle stock value</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {formatMoney(analysis.cashFlow.idleValue)}
              </p>
              <p className="text-xs text-gray-400">of {formatMoney(analysis.cashFlow.stockValue)} on hand</p>
            </div>
          </div>

          <div className="card p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Supplier</th>
                    <th className="table-th text-right">Purchased</th>
                    <th className="table-th text-right">Paid</th>
                    <th className="table-th text-right">Sold (Out)</th>
                    <th className="table-th text-right">Units Out</th>
                    <th className="table-th text-right">Profit</th>
                    <th className="table-th text-right">Margin</th>
                    <th className="table-th text-right">Idle Value</th>
                    <th className="table-th text-right">Stock Value</th>
                    <th className="table-th text-right">Products</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analysis.suppliers.map((s) => {
                    // Slow supplier: bought a lot but sold little.
                    const slow = s.purchaseIn > 0 && s.salesOut < s.purchaseIn * 0.5;
                    const fast =
                      analysis.fastest != null && s.name === analysis.fastest.name && s.unitsOut > 0;
                    return (
                      <tr key={s.id}>
                        <td className="table-td font-medium">
                          {s.name}
                          {fast && (
                            <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                              fast mover
                            </span>
                          )}
                          {slow && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                              high in / low out
                            </span>
                          )}
                          {s.idleValue > 0 && (
                            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                              {s.idleCount} idle
                            </span>
                          )}
                        </td>
                        <td className="table-td text-right">{formatMoney(s.purchaseIn)}</td>
                        <td className="table-td text-right text-red-600">
                          {formatMoney(s.paidInPeriod)}
                        </td>
                        <td className="table-td text-right">{formatMoney(s.salesOut)}</td>
                        <td className="table-td text-right">{s.unitsOut || "—"}</td>
                        <td
                          className={`table-td text-right font-semibold ${
                            s.profit >= 0 ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {formatMoney(s.profit)}
                        </td>
                        <td className="table-td text-right">{s.marginPct}%</td>
                        <td className="table-td text-right text-amber-700">
                          {s.idleValue ? formatMoney(s.idleValue) : "—"}
                        </td>
                        <td className="table-td text-right">
                          <button
                            onClick={() => openSupplierStock(s.id)}
                            className="font-medium text-brand hover:underline"
                            title="See this supplier's stock items"
                          >
                            {formatMoney(s.stockValue)}
                          </button>
                        </td>
                        <td className="table-td text-right">{s.productCount}</td>
                      </tr>
                    );
                  })}
                  {analysis.suppliers.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={10}>
                        No suppliers yet. Add suppliers and link them to products to see this.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-gray-400">
              <b>Purchased</b> = bills raised to the supplier · <b>Paid</b> = cash given to them in
              this period · <b>Sold / Units Out</b> = how fast their products move ·{" "}
              <b>Profit</b> = sales of their products − cost · <b>Idle Value</b> = their stock that
              had no sale this period (dead money) · <b>Stock Value</b> = all their stock on hand
              (click to see items). Sorted best-first; badges flag fast movers and idle stock.
            </p>
          </div>
        </>
      )}

      {/* Supplier stock items popup */}
      {supplierStock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSupplierStock(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Stock from {supplierStock.supplier.name}
                </h2>
                <p className="text-xs text-gray-500">
                  Total stock value <b>{formatMoney(supplierStock.totalValue)}</b>
                  {supplierStock.asOf ? ` · as of ${formatDate(supplierStock.asOf)}` : " · current"}
                </p>
              </div>
              <button
                onClick={() => setSupplierStock(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Stock In</th>
                    <th className="table-th text-right">Stock Out</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Cost</th>
                    <th className="table-th text-right">Stock Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierStock.items.map((it) => (
                    <tr key={it.id}>
                      <td className="table-td font-medium">
                        {it.name}
                        {it.low && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                            low stock
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right text-green-700">
                        {it.stockIn ? `+${it.stockIn}` : "—"}
                      </td>
                      <td className="table-td text-right text-red-600">
                        {it.stockOut ? `−${it.stockOut}` : "—"}
                      </td>
                      <td className="table-td text-right font-medium">
                        {it.stockQty} {it.unit}
                      </td>
                      <td className="table-td text-right">{formatMoney(it.purchasePrice)}</td>
                      <td className="table-td text-right font-semibold">
                        {formatMoney(it.value)}
                      </td>
                    </tr>
                  ))}
                  {supplierStock.items.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={6}>
                        No products linked to this supplier yet. Set the supplier on each
                        product in the shop's Products page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT */}
      {tab === "stock" && stock && (
        <>
          {/* Headline KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm text-gray-500">📦 Stock value (on hand)</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(stock.totals.stockValue)}</p>
              <p className="text-xs text-gray-400">{stock.totals.products} products</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">📥 Stock In</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {stock.totals.inQty}
              </p>
              <p className="text-xs text-gray-400">{formatMoney(stock.totals.inValue)} at cost</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">📤 Stock Out</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stock.totals.outQty}</p>
              <p className="text-xs text-gray-400">{formatMoney(stock.totals.outValue)} at cost</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">🐌 Idle / low</p>
              <p className="mt-1 text-2xl font-bold">
                {stock.totals.idle}
                <span className="text-base font-medium text-gray-400"> idle</span>
              </p>
              <p className="text-xs text-amber-600">{stock.totals.lowStock} below reorder</p>
            </div>
          </div>

          {/* Fast moving vs most days in stock */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card p-0">
              <div className="border-b px-5 py-3 font-semibold">
                ⚡ Fastest-moving material{" "}
                <span className="font-normal text-gray-400">(most sold in period)</span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Sold (Out)</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Days cover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.fastMoving.map((it) => (
                    <tr
                      key={it.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openItemMovements(it.id)}
                    >
                      <td className="table-td font-medium text-brand">{it.name}</td>
                      <td className="table-td text-right font-semibold text-red-600">
                        {it.outQty} {it.unit}
                      </td>
                      <td className="table-td text-right">{it.onHand}</td>
                      <td className="table-td text-right">
                        {it.daysCover != null ? `${it.daysCover}d` : "—"}
                      </td>
                    </tr>
                  ))}
                  {stock.fastMoving.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={4}>
                        No outward movement in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card p-0">
              <div className="border-b px-5 py-3 font-semibold">
                🕒 Most days in stock{" "}
                <span className="font-normal text-gray-400">(slow / sitting longest)</span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Days idle</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.slowMoving.map((it) => (
                    <tr
                      key={it.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openItemMovements(it.id)}
                    >
                      <td className="table-td font-medium text-brand">{it.name}</td>
                      <td className="table-td text-right font-semibold text-amber-700">
                        {it.stockedDays != null ? `${it.stockedDays}d` : "—"}
                      </td>
                      <td className="table-td text-right">
                        {it.onHand} {it.unit}
                      </td>
                      <td className="table-td text-right">{formatMoney(it.value)}</td>
                    </tr>
                  ))}
                  {stock.slowMoving.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={4}>
                        Nothing on hand yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full movement register */}
          <div className="card p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
              <span className="font-semibold">
                Material Movement Register{" "}
                <span className="font-normal text-gray-400">
                  (click a product for its full entry / exit history)
                </span>
              </span>
              <button
                onClick={backfillEntryDates}
                disabled={backfilling}
                className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-light disabled:opacity-50"
                title="Give existing products without an entry date today's date"
              >
                {backfilling ? "Setting…" : "Set entry date for old stock"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">First In</th>
                    <th className="table-th">Last In</th>
                    <th className="table-th">Last Out</th>
                    <th className="table-th text-right">In</th>
                    <th className="table-th text-right">Out</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Days idle</th>
                    <th className="table-th text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.items.map((it) => (
                    <tr
                      key={it.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openItemMovements(it.id)}
                    >
                      <td className="table-td font-medium text-brand">
                        {it.name}
                        {it.low && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                            low
                          </span>
                        )}
                        {it.idle && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                            idle
                          </span>
                        )}
                      </td>
                      <td className="table-td text-gray-500">
                        {it.firstIn ? formatDate(it.firstIn) : "—"}
                      </td>
                      <td className="table-td text-gray-500">
                        {it.lastIn ? formatDate(it.lastIn) : "—"}
                      </td>
                      <td className="table-td text-gray-500">
                        {it.lastOut ? formatDate(it.lastOut) : "—"}
                      </td>
                      <td className="table-td text-right text-green-700">
                        {it.inQty ? `+${it.inQty}` : "—"}
                      </td>
                      <td className="table-td text-right text-red-600">
                        {it.outQty ? `−${it.outQty}` : "—"}
                      </td>
                      <td className="table-td text-right font-medium">
                        {it.onHand} {it.unit}
                      </td>
                      <td className="table-td text-right">
                        {it.stockedDays != null ? `${it.stockedDays}d` : "—"}
                      </td>
                      <td className="table-td text-right font-semibold">
                        {formatMoney(it.value)}
                      </td>
                    </tr>
                  ))}
                  {stock.items.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={9}>
                        No products with stock tracking in this shop yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-gray-400">
              <b>In / Out</b> are the units that entered or left within the selected period.{" "}
              <b>On hand</b> is the balance as of the "To" date. <b>Days idle</b> = days since the
              product last moved out — high values flag slow / dead stock. Click any product to see
              every entry and exit with the running balance.
            </p>
          </div>
        </>
      )}

      {/* Per-product entry / exit timeline modal */}
      {itemMoves && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setItemMoves(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{itemMoves.item.name}</h2>
                <p className="text-xs text-gray-500">
                  {itemMoves.item.sku ? `${itemMoves.item.sku} · ` : ""}
                  On hand <b>{itemMoves.item.stockQty} {itemMoves.item.unit}</b> ·{" "}
                  In <span className="text-green-700">+{itemMoves.summary.inQty}</span> ·{" "}
                  Out <span className="text-red-600">−{itemMoves.summary.outQty}</span>
                  {itemMoves.item.supplier ? ` · Supplier: ${itemMoves.item.supplier}` : ""}
                </p>
              </div>
              <button
                onClick={() => setItemMoves(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Movement</th>
                    <th className="table-th">Reference</th>
                    <th className="table-th text-right">Change</th>
                    <th className="table-th text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemMoves.movements.map((m) => {
                    const inward = m.quantity >= 0;
                    return (
                      <tr key={m.id}>
                        <td className="table-td">{formatDate(m.date)}</td>
                        <td className="table-td">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              inward
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {MOVE_LABELS[m.type] ?? m.type}
                          </span>
                          {m.reason ? (
                            <span className="ml-2 text-gray-500">{m.reason}</span>
                          ) : null}
                        </td>
                        <td className="table-td text-gray-500">{m.reference ?? "—"}</td>
                        <td
                          className={`table-td text-right font-semibold ${
                            inward ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {inward ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="table-td text-right font-medium">
                          {m.balanceAfter} {itemMoves.item.unit}
                        </td>
                      </tr>
                    );
                  })}
                  {itemMoves.movements.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={5}>
                        No movements recorded for this product in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASH BOOK */}
      {tab === "cashbook" && cashbook && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm text-gray-500">💵 Cash balance</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(cashbook.cashBalance)}</p>
              <p className="text-xs text-gray-400">opening {formatMoney(cashbook.openingCash)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">🏦 Bank balance</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(cashbook.bankBalance)}</p>
              <p className="text-xs text-gray-400">opening {formatMoney(cashbook.openingBank)}</p>
            </div>
            <button
              className="card text-left transition hover:border-brand"
              onClick={() => setBillsView("receivables")}
            >
              <p className="text-sm text-gray-500">📥 Balance to receive</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {formatMoney(cashbook.toReceive)}
              </p>
              <p className="text-xs text-brand">click to see the bills →</p>
            </button>
            <button
              className="card text-left transition hover:border-brand"
              onClick={() => setBillsView("payables")}
            >
              <p className="text-sm text-gray-500">📤 Balance to pay</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatMoney(cashbook.toPay)}
              </p>
              <p className="text-xs text-brand">click to see the bills →</p>
            </button>
          </div>

          {/* Daily credit / debit with running balances */}
          <div className="card mb-6 p-0">
            <div className="border-b px-5 py-3 font-semibold">Daily Cash Book</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th text-right">Credit (In)</th>
                    <th className="table-th text-right">Debit (Out)</th>
                    <th className="table-th text-right">Cash Balance</th>
                    <th className="table-th text-right">Bank Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashbook.days.map((d) => (
                    <tr key={d.day}>
                      <td className="table-td font-medium">{d.day}</td>
                      <td className="table-td text-right text-green-700">
                        {d.credit ? `+${formatMoney(d.credit)}` : "—"}
                      </td>
                      <td className="table-td text-right text-red-600">
                        {d.debit ? `−${formatMoney(d.debit)}` : "—"}
                      </td>
                      <td className="table-td text-right">{formatMoney(d.cashBalance)}</td>
                      <td className="table-td text-right">{formatMoney(d.bankBalance)}</td>
                    </tr>
                  ))}
                  {cashbook.days.length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={5}>
                        No vouchers in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit report / payment report */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {(["IN", "OUT"] as const).map((dir) => (
              <div key={dir} className="card p-0">
                <div className="border-b px-5 py-3 font-semibold">
                  {dir === "IN" ? "Credit Report (money received)" : "Payment Report (money given)"}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="table-th">Date</th>
                        <th className="table-th">Party</th>
                        <th className="table-th">Bill</th>
                        <th className="table-th">Mode</th>
                        <th className="table-th text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vouchers
                        .filter((v) => (v.direction ?? "IN") === dir)
                        .map((v) => (
                          <tr key={v.id}>
                            <td className="table-td">{formatDate(v.paymentDate)}</td>
                            <td className="table-td font-medium">
                              {v.party?.name ?? v.purpose ?? "—"}
                            </td>
                            <td className="table-td text-gray-500">
                              {v.invoice?.invoiceNumber ?? v.purpose ?? "—"}
                            </td>
                            <td className="table-td">{v.method}</td>
                            <td
                              className={`table-td text-right font-semibold ${
                                dir === "IN" ? "text-green-700" : "text-red-600"
                              }`}
                            >
                              {formatMoney(v.amount)}
                            </td>
                          </tr>
                        ))}
                      {vouchers.filter((v) => (v.direction ?? "IN") === dir).length === 0 && (
                        <tr>
                          <td className="table-td text-gray-400" colSpan={5}>
                            None in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Receivable / payable bill list popup */}
      {billsView && cashbook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBillsView(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">
                {billsView === "receivables"
                  ? `Bills to receive — ${formatMoney(cashbook.toReceive)}`
                  : `Bills to pay — ${formatMoney(cashbook.toPay)}`}
              </h2>
              <button
                onClick={() => setBillsView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="table-th">Bill</th>
                    <th className="table-th">{billsView === "receivables" ? "Customer" : "Supplier"}</th>
                    <th className="table-th">Date</th>
                    <th className="table-th text-right">Total</th>
                    <th className="table-th text-right">Paid</th>
                    <th className="table-th text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(billsView === "receivables" ? cashbook.receivables : cashbook.payables).map(
                    (b) => (
                      <tr key={b.id}>
                        <td className="table-td">
                          <Link
                            href={`/invoices/${b.id}`}
                            target="_blank"
                            className="font-medium text-brand hover:underline"
                            title="Open invoice"
                          >
                            {b.number} ↗
                          </Link>
                        </td>
                        <td className="table-td">{b.party}</td>
                        <td className="table-td">{formatDate(b.date)}</td>
                        <td className="table-td text-right">{formatMoney(b.total)}</td>
                        <td className="table-td text-right">{formatMoney(b.paid)}</td>
                        <td
                          className={`table-td text-right font-bold ${
                            billsView === "receivables" ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {formatMoney(b.due)}
                        </td>
                      </tr>
                    )
                  )}
                  {(billsView === "receivables" ? cashbook.receivables : cashbook.payables)
                    .length === 0 && (
                    <tr>
                      <td className="table-td text-gray-400" colSpan={6}>
                        Nothing pending. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
