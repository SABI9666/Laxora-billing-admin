"use client";

import { useMemo, useState } from "react";
import { formatMoney, formatDate } from "@/lib/format";

export type CashTxn = {
  id: string;
  date: string;
  kind: "RECEIPT" | "PAYMENT" | "EXPENSE" | "DEPOSIT" | "WITHDRAWAL";
  book: "CASH" | "BANK" | "TRANSFER";
  method: string;
  party: string | null;
  bill: string | null;
  purpose: string | null;
  notes: string | null;
  cashIn: number;
  cashOut: number;
  bankIn: number;
  bankOut: number;
  cashBalance: number;
  bankBalance: number;
};

export type CashDay = {
  day: string;
  inCash: number;
  inBank: number;
  outCash: number;
  outBank: number;
  toBank: number;
  toCash: number;
  cashBalance: number;
  bankBalance: number;
};

type Props = {
  shop: string;
  periodLabel: string;
  openingCash: number;
  openingBank: number;
  cashBalance: number;
  bankBalance: number;
  depositedToBank: number;
  withdrawnToCash: number;
  days: CashDay[];
  transactions: CashTxn[];
};

type View = "daily" | "cash" | "bank";

const kindLabel: Record<CashTxn["kind"], string> = {
  RECEIPT: "Receipt",
  PAYMENT: "Payment",
  EXPENSE: "Expense",
  DEPOSIT: "Deposit to bank",
  WITHDRAWAL: "Withdrawn from bank",
};
const kindClass: Record<CashTxn["kind"], string> = {
  RECEIPT: "bg-green-50 text-green-800",
  PAYMENT: "bg-red-50 text-red-700",
  EXPENSE: "bg-amber-50 text-amber-800",
  DEPOSIT: "bg-blue-50 text-blue-800",
  WITHDRAWAL: "bg-blue-50 text-blue-800",
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// One line of "what this movement was", built from party, bill, purpose and
// notes — so a row reads like "TEENA · Bill 26-27700 · Customer Receipt".
function particulars(t: CashTxn): string {
  const bits: string[] = [];
  if (t.party) bits.push(t.party);
  if (t.bill) bits.push(`Bill ${t.bill}`);
  if (t.purpose && t.kind !== "DEPOSIT" && t.kind !== "WITHDRAWAL") bits.push(t.purpose);
  if (t.notes) bits.push(t.notes);
  return bits.join(" · ") || kindLabel[t.kind];
}

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCsv(name: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  // BOM so Excel reads the rupee sign and Unicode names correctly.
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// The admin cash book: a daily summary that opens into each day's
// movements, plus a Cash Book and a Bank Book at transaction level, each
// with a running balance and a CSV download of exactly what is on screen.
export default function CashBookView(p: Props) {
  const [view, setView] = useState<View>("daily");
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  const byDay = useMemo(() => {
    const m = new Map<string, CashTxn[]>();
    for (const t of p.transactions) {
      const k = t.date.slice(0, 10);
      const list = m.get(k) ?? [];
      list.push(t);
      m.set(k, list);
    }
    return m;
  }, [p.transactions]);

  const toggleDay = (d: string) =>
    setOpenDays((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  const allOpen = p.days.length > 0 && p.days.every((d) => openDays.has(d.day));

  // Transaction-level rows for the cash or bank book.
  const bookRows = (book: "CASH" | "BANK") =>
    p.transactions.filter((t) =>
      book === "CASH" ? t.cashIn > 0 || t.cashOut > 0 : t.bankIn > 0 || t.bankOut > 0
    );

  const fileStem = `${p.shop.replace(/[^\w]+/g, "-")}-${p.periodLabel.replace(/[^\w]+/g, "-")}`;

  function exportCurrent() {
    if (view === "daily") {
      const rows: (string | number)[][] = [
        [`${p.shop} — Daily Cash Book — ${p.periodLabel}`],
        [],
        ["Date", "Cash In", "Cash Out", "Cash Balance", "Bank In", "Bank Out", "Bank Balance", "Cash → Bank", "Bank → Cash"],
        ["Opening balance", "", "", p.openingCash, "", "", p.openingBank, "", ""],
        ...p.days.map((d) => [d.day, d.inCash, d.outCash, d.cashBalance, d.inBank, d.outBank, d.bankBalance, d.toBank, d.toCash]),
        [
          "Total / Closing",
          sum(p.days, "inCash"),
          sum(p.days, "outCash"),
          p.cashBalance,
          sum(p.days, "inBank"),
          sum(p.days, "outBank"),
          p.bankBalance,
          p.depositedToBank,
          p.withdrawnToCash,
        ],
      ];
      downloadCsv(`daily-cashbook-${fileStem}.csv`, rows);
      return;
    }
    const book = view === "cash" ? "CASH" : "BANK";
    const rows = bookRows(book);
    const inKey = book === "CASH" ? "cashIn" : "bankIn";
    const outKey = book === "CASH" ? "cashOut" : "bankOut";
    const balKey = book === "CASH" ? "cashBalance" : "bankBalance";
    downloadCsv(`${book.toLowerCase()}-book-${fileStem}.csv`, [
      [`${p.shop} — ${book === "CASH" ? "Cash" : "Bank"} Book — ${p.periodLabel}`],
      [],
      ["Date", "Time", "Type", "Particulars", "Mode", "In", "Out", "Balance"],
      ["Opening balance", "", "", "", "", "", "", book === "CASH" ? p.openingCash : p.openingBank],
      ...rows.map((t) => [
        t.date.slice(0, 10),
        time(t.date),
        kindLabel[t.kind],
        particulars(t),
        t.method,
        t[inKey] || "",
        t[outKey] || "",
        t[balKey],
      ]),
      [
        "Total / Closing",
        "",
        "",
        "",
        "",
        rows.reduce((s, t) => s + t[inKey], 0),
        rows.reduce((s, t) => s + t[outKey], 0),
        book === "CASH" ? p.cashBalance : p.bankBalance,
      ],
    ]);
  }

  const tabBtn = (v: View, label: string) => (
    <button
      key={v}
      onClick={() => setView(v)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        view === v ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="card mb-6 p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div>
          <span className="font-semibold">
            {view === "daily" ? "Daily Cash Book" : view === "cash" ? "Cash Book" : "Bank Book"}
          </span>
          <span className="ml-2 text-xs text-gray-400">
            {view === "daily"
              ? "Cash = notes in the shop drawer · Bank = UPI, card, cheque & transfers · click a day to see its entries"
              : view === "cash"
              ? "Every rupee that came into or left the cash drawer, with the balance after each entry"
              : "Every UPI, card, cheque and bank transfer, with the balance after each entry"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabBtn("daily", "Daily summary")}
          {tabBtn("cash", "💵 Cash Book")}
          {tabBtn("bank", "🏦 Bank Book")}
          <button onClick={exportCurrent} className="btn-secondary text-sm" title="Download what is on screen as a CSV / Excel file">
            ⬇ Download CSV
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-sm">
            🖨️ Print
          </button>
        </div>
      </div>

      {view === "daily" && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">
                  <button
                    className="text-brand hover:underline"
                    onClick={() =>
                      setOpenDays(allOpen ? new Set() : new Set(p.days.map((d) => d.day)))
                    }
                  >
                    {allOpen ? "Collapse all" : "Expand all"}
                  </button>
                </th>
                <th className="table-th text-right">Cash In</th>
                <th className="table-th text-right">Cash Out</th>
                <th className="table-th text-right">Cash Balance</th>
                <th className="table-th text-right">Bank In</th>
                <th className="table-th text-right">Bank Out</th>
                <th className="table-th text-right">Bank Balance</th>
                <th className="table-th text-right">Cash ⇄ Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50/60">
                <td className="table-td font-semibold text-gray-500">Opening balance</td>
                <td className="table-td" colSpan={2} />
                <td className="table-td text-right font-semibold">{formatMoney(p.openingCash)}</td>
                <td className="table-td" colSpan={2} />
                <td className="table-td text-right font-semibold">{formatMoney(p.openingBank)}</td>
                <td className="table-td" />
              </tr>
              {p.days.map((d) => {
                const open = openDays.has(d.day);
                const txns = byDay.get(d.day) ?? [];
                return (
                  <DayRows
                    key={d.day}
                    d={d}
                    open={open}
                    txns={txns}
                    onToggle={() => toggleDay(d.day)}
                  />
                );
              })}
              {p.days.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="table-td">Total / Closing</td>
                  <td className="table-td text-right text-green-700">+{formatMoney(sum(p.days, "inCash"))}</td>
                  <td className="table-td text-right text-red-600">−{formatMoney(sum(p.days, "outCash"))}</td>
                  <td className="table-td text-right">{formatMoney(p.cashBalance)}</td>
                  <td className="table-td text-right text-green-700">+{formatMoney(sum(p.days, "inBank"))}</td>
                  <td className="table-td text-right text-red-600">−{formatMoney(sum(p.days, "outBank"))}</td>
                  <td className="table-td text-right">{formatMoney(p.bankBalance)}</td>
                  <td className="table-td text-right text-xs text-blue-600">
                    {p.depositedToBank > 0 && <div>→ Bank {formatMoney(p.depositedToBank)}</div>}
                    {p.withdrawnToCash > 0 && <div>→ Cash {formatMoney(p.withdrawnToCash)}</div>}
                    {!p.depositedToBank && !p.withdrawnToCash && "—"}
                  </td>
                </tr>
              )}
              {p.days.length === 0 && (
                <tr>
                  <td className="table-td text-gray-400" colSpan={8}>
                    No cash or bank movement in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view !== "daily" && (
        <BookTable
          book={view === "cash" ? "CASH" : "BANK"}
          rows={bookRows(view === "cash" ? "CASH" : "BANK")}
          opening={view === "cash" ? p.openingCash : p.openingBank}
          closing={view === "cash" ? p.cashBalance : p.bankBalance}
        />
      )}
    </div>
  );
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return Math.round(rows.reduce((s, r) => s + Number(r[key] ?? 0), 0) * 100) / 100;
}

function DayRows({
  d,
  open,
  txns,
  onToggle,
}: {
  d: CashDay;
  open: boolean;
  txns: CashTxn[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="table-td font-medium">
          <span className="mr-2 inline-block w-3 text-gray-400">{open ? "▾" : "▸"}</span>
          {formatDate(d.day)}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {txns.length} {txns.length === 1 ? "entry" : "entries"}
          </span>
        </td>
        <td className="table-td text-right text-green-700">{d.inCash ? `+${formatMoney(d.inCash)}` : "—"}</td>
        <td className="table-td text-right text-red-600">{d.outCash ? `−${formatMoney(d.outCash)}` : "—"}</td>
        <td className="table-td text-right font-medium">{formatMoney(d.cashBalance)}</td>
        <td className="table-td text-right text-green-700">{d.inBank ? `+${formatMoney(d.inBank)}` : "—"}</td>
        <td className="table-td text-right text-red-600">{d.outBank ? `−${formatMoney(d.outBank)}` : "—"}</td>
        <td className="table-td text-right font-medium">{formatMoney(d.bankBalance)}</td>
        <td className="table-td text-right text-xs text-blue-600">
          {d.toBank > 0 && <div>→ Bank {formatMoney(d.toBank)}</div>}
          {d.toCash > 0 && <div>→ Cash {formatMoney(d.toCash)}</div>}
          {!d.toBank && !d.toCash && <span className="text-gray-400">—</span>}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/70">
          <td colSpan={8} className="px-4 pb-3 pt-1">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <DayBook title="💵 Cash" book="CASH" txns={txns} />
              <DayBook title="🏦 Bank" book="BANK" txns={txns} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// One day's entries for one book, as shown under an expanded day row.
function DayBook({ title, book, txns }: { title: string; book: "CASH" | "BANK"; txns: CashTxn[] }) {
  const inKey = book === "CASH" ? "cashIn" : "bankIn";
  const outKey = book === "CASH" ? "cashOut" : "bankOut";
  const balKey = book === "CASH" ? "cashBalance" : "bankBalance";
  const rows = txns.filter((t) => t[inKey] > 0 || t[outKey] > 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400">No {book.toLowerCase()} movement this day.</p>
      ) : (
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-400">{time(t.date)}</td>
                <td className="px-2 py-1.5">
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass[t.kind]}`}>
                    {kindLabel[t.kind]}
                  </span>
                  <span className="text-slate-700">{particulars(t)}</span>
                  {book === "BANK" && <span className="ml-1 text-slate-400">({t.method})</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-green-700">
                  {t[inKey] ? `+${formatMoney(t[inKey])}` : ""}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-red-600">
                  {t[outKey] ? `−${formatMoney(t[outKey])}` : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">
                  {formatMoney(t[balKey])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Transaction-level cash or bank book with opening, entries and closing.
function BookTable({
  book,
  rows,
  opening,
  closing,
}: {
  book: "CASH" | "BANK";
  rows: CashTxn[];
  opening: number;
  closing: number;
}) {
  const inKey = book === "CASH" ? "cashIn" : "bankIn";
  const outKey = book === "CASH" ? "cashOut" : "bankOut";
  const balKey = book === "CASH" ? "cashBalance" : "bankBalance";
  const totalIn = rows.reduce((s, t) => s + t[inKey], 0);
  const totalOut = rows.reduce((s, t) => s + t[outKey], 0);
  let lastDay = "";
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Type</th>
            <th className="table-th w-full">Particulars</th>
            <th className="table-th">Mode</th>
            <th className="table-th text-right">In</th>
            <th className="table-th text-right">Out</th>
            <th className="table-th text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr className="bg-gray-50/60">
            <td className="table-td font-semibold text-gray-500" colSpan={6}>
              Opening balance
            </td>
            <td className="table-td text-right font-semibold">{formatMoney(opening)}</td>
          </tr>
          {rows.map((t) => {
            const day = t.date.slice(0, 10);
            const first = day !== lastDay;
            lastDay = day;
            return (
              <tr key={t.id} className={first ? "border-t-2 border-slate-200" : ""}>
                <td className="table-td whitespace-nowrap">
                  {first ? <span className="font-medium">{formatDate(day)}</span> : ""}
                  <span className="ml-1 text-xs text-gray-400">{time(t.date)}</span>
                </td>
                <td className="table-td whitespace-nowrap">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${kindClass[t.kind]}`}>
                    {kindLabel[t.kind]}
                  </span>
                </td>
                <td className="table-td w-full max-w-0 break-words">{particulars(t)}</td>
                <td className="table-td whitespace-nowrap text-gray-500">{t.method}</td>
                <td className="table-td whitespace-nowrap text-right text-green-700">
                  {t[inKey] ? `+${formatMoney(t[inKey])}` : "—"}
                </td>
                <td className="table-td whitespace-nowrap text-right text-red-600">
                  {t[outKey] ? `−${formatMoney(t[outKey])}` : "—"}
                </td>
                <td className="table-td whitespace-nowrap text-right font-medium">{formatMoney(t[balKey])}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="table-td text-gray-400" colSpan={7}>
                No {book === "CASH" ? "cash" : "bank"} entries in this period.
              </td>
            </tr>
          )}
          <tr className="bg-gray-50 font-semibold">
            <td className="table-td" colSpan={4}>
              Total / Closing
            </td>
            <td className="table-td whitespace-nowrap text-right text-green-700">+{formatMoney(totalIn)}</td>
            <td className="table-td whitespace-nowrap text-right text-red-600">−{formatMoney(totalOut)}</td>
            <td className="table-td text-right">{formatMoney(closing)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
