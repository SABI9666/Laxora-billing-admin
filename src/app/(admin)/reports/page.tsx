"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Tab = "sales" | "pnl" | "customers" | "suppliers";

type SalesReport = {
  months: { month: string; count: number; total: number; tax: number }[];
  totals: { total: number; tax: number; count: number };
};
type Pnl = {
  pnl: {
    salesGross: number;
    salesNet: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
    taxCollected: number;
    purchases: number;
    taxPaid: number;
    salesCount: number;
    purchaseCount: number;
  };
};
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
];

export default function ReportsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);

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

  const showDates = tab === "sales" || tab === "pnl";

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
        <div className="card max-w-xl">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Sales (gross)" value={formatMoney(pnl.pnl.salesGross)} />
              <Row label="Sales (net of tax)" value={formatMoney(pnl.pnl.salesNet)} />
              <Row label="Cost of goods sold" value={`- ${formatMoney(pnl.pnl.cogs)}`} />
              <Row label="Gross Profit" value={formatMoney(pnl.pnl.grossProfit)} bold />
              <Row label="Gross Margin" value={`${pnl.pnl.grossMarginPct}%`} />
              <tr>
                <td colSpan={2} className="py-2">
                  <hr />
                </td>
              </tr>
              <Row label="Tax collected (output)" value={formatMoney(pnl.pnl.taxCollected)} />
              <Row label="Total purchases" value={formatMoney(pnl.pnl.purchases)} />
              <Row label="Tax paid (input)" value={formatMoney(pnl.pnl.taxPaid)} />
              <Row label="Sales bills / Purchase bills" value={`${pnl.pnl.salesCount} / ${pnl.pnl.purchaseCount}`} />
            </tbody>
          </table>
        </div>
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
                      <th className="table-th text-right">Debit</th>
                      <th className="table-th text-right">Credit</th>
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
                        <td className="table-td text-right">{e.credit ? formatMoney(e.credit) : "—"}</td>
                        <td className="table-td text-right font-medium">{formatMoney(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between border-t px-5 py-3 font-semibold">
                  <span>Closing balance</span>
                  <span>{formatMoney(ledger.closingBalance)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
