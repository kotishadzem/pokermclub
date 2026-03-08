"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/lib/currency";

interface TxRecord {
  id: string;
  type: string;
  amount: number;
  amountInGel: number | null;
  currencyCode: string;
  exchangeRate: number;
  currency: { id: string; code: string; symbol: string } | null;
  notes: string | null;
  paymentMethod: string | null;
  bankAccount: { id: string; name: string } | null;
  createdAt: string;
  player: { id: string; firstName: string; lastName: string };
  user: { id: string; name: string };
}

interface TipCollectionRecord {
  id: string;
  tableId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  table: { id: string; name: string };
  user: { name: string };
}

interface TipsReport {
  date: string;
  grandTotal: number;
  byTable: { tableId: string; tableName: string; total: number; count: number }[];
  collections: TipCollectionRecord[];
}

interface RakeCollectionRecord {
  id: string;
  tableId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  table: { id: string; name: string };
  user: { name: string };
}

interface RakeReport {
  date: string;
  grandTotal: number;
  byTable: { tableId: string; tableName: string; total: number; count: number }[];
  collections: RakeCollectionRecord[];
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "BUY_IN", label: "Buy-in" },
  { value: "CASH_OUT", label: "Cash-out" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "RAKEBACK_PAYOUT", label: "Rakeback Payout" },
];

function typeColor(type: string): string {
  if (type === "BUY_IN" || type === "DEPOSIT") return "var(--felt-green-light)";
  if (type === "CASH_OUT" || type === "WITHDRAWAL") return "var(--danger)";
  return "var(--accent-gold)";
}

function typeBadgeBg(type: string): string {
  if (type === "BUY_IN" || type === "DEPOSIT") return "rgba(13, 74, 46, 0.25)";
  if (type === "CASH_OUT" || type === "WITHDRAWAL") return "rgba(199, 69, 69, 0.15)";
  return "rgba(201, 168, 76, 0.15)";
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function TransactionsPage() {
  const { formatMoney } = useCurrency();
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [limit, setLimit] = useState(50);
  const [tipsReport, setTipsReport] = useState<TipsReport | null>(null);
  const [rakeReport, setRakeReport] = useState<RakeReport | null>(null);

  useEffect(() => {
    fetch("/api/tips").then(r => r.json()).then(setTipsReport).catch(() => {});
    fetch("/api/rake-collections").then(r => r.json()).then(setRakeReport).catch(() => {});
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    params.set("limit", limit.toString());
    const res = await fetch(`/api/transactions?${params}`);
    setTransactions(await res.json());
    setLoading(false);
  }, [typeFilter, fromDate, toDate, limit]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Client-side player name filter
  const filtered = playerFilter
    ? transactions.filter(t =>
        `${t.player.firstName} ${t.player.lastName}`.toLowerCase().includes(playerFilter.toLowerCase())
      )
    : transactions;

  const totalShown = filtered.reduce((sum, t) => {
    const gelAmt = t.amountInGel ?? t.amount;
    if (t.type === "BUY_IN" || t.type === "DEPOSIT") return sum + gelAmt;
    return sum - gelAmt;
  }, 0);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Transactions</h1>
        <p className="mt-1 text-sm text-muted">{filtered.length} transactions</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-44">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm outline-none cursor-pointer"
              style={{ color: "var(--foreground)" }}
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm outline-none"
              style={{ color: "var(--foreground)", colorScheme: "dark" }}
            />
          </div>
          <div className="w-40">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm outline-none"
              style={{ color: "var(--foreground)", colorScheme: "dark" }}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Player</label>
            <input
              type="text"
              value={playerFilter}
              onChange={e => setPlayerFilter(e.target.value)}
              placeholder="Filter by player name..."
              className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent-gold/50"
              style={{ color: "var(--foreground)" }}
            />
          </div>
          {(typeFilter || fromDate || toDate || playerFilter) && (
            <button
              onClick={() => { setTypeFilter(""); setFromDate(""); setToDate(""); setPlayerFilter(""); }}
              className="rounded-lg border border-card-border px-3 py-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Net Summary */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <span className="text-xs text-muted tracking-wider uppercase">Net total:</span>
        <span className="text-sm font-bold" style={{ color: totalShown >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
          {totalShown >= 0 ? "+" : ""}{formatMoney(totalShown)}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Date/Time</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Player</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Type</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Amount</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Payment</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No transactions found</td></tr>
            ) : (
              filtered.map(tx => (
                <tr key={tx.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString()}<br />
                    <span className="text-[10px]">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-5 py-3 font-medium">{tx.player.firstName} {tx.player.lastName}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: typeColor(tx.type), backgroundColor: typeBadgeBg(tx.type) }}
                    >
                      {formatType(tx.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: typeColor(tx.type) }}>
                    {tx.type === "CASH_OUT" || tx.type === "WITHDRAWAL" || tx.type === "RAKEBACK_PAYOUT" ? "-" : "+"}
                    {formatMoney(tx.amountInGel ?? tx.amount)}
                    {tx.currencyCode !== "GEL" && (
                      <span className="block text-[10px] font-normal text-muted">
                        {tx.currency?.symbol || tx.currencyCode} {tx.amount.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">
                    {tx.paymentMethod === "BANK" ? (tx.bankAccount ? `Bank - ${tx.bankAccount.name}` : "Bank") : "Cash"}
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tx.notes || "—"}</td>
                  <td className="px-5 py-3 text-muted text-xs">{tx.user.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {!loading && transactions.length >= limit && (
        <div className="text-center mt-4">
          <button
            onClick={() => setLimit(l => l + 50)}
            className="rounded-lg border border-card-border px-5 py-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground hover:border-accent-gold/30 transition-colors cursor-pointer"
          >
            Load More
          </button>
        </div>
      )}

      {/* Recent Rake */}
      {rakeReport && rakeReport.collections.length > 0 && (
        <div className="mt-8" style={{ animation: "floatUp 0.4s ease-out" }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recent Rake</h2>
            <p className="mt-1 text-sm text-muted">
              {rakeReport.collections.length} collection{rakeReport.collections.length !== 1 ? "s" : ""} — Total: <span style={{ color: "var(--felt-green-light)" }}>{formatMoney(rakeReport.grandTotal)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Date/Time</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Table</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Amount</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {rakeReport.collections.map(rc => (
                  <tr key={rc.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(rc.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(rc.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--felt-green-light)" }}>{rc.table.name}</td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--felt-green-light)" }}>{formatMoney(rc.amount)}</td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{rc.notes || "—"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{rc.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Tips */}
      {tipsReport && tipsReport.collections.length > 0 && (
        <div className="mt-8" style={{ animation: "floatUp 0.4s ease-out" }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recent Tips</h2>
            <p className="mt-1 text-sm text-muted">
              {tipsReport.collections.length} tip{tipsReport.collections.length !== 1 ? "s" : ""} — Total: <span style={{ color: "var(--accent-gold)" }}>{formatMoney(tipsReport.grandTotal)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Date/Time</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Table</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Amount</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {tipsReport.collections.map(tc => (
                  <tr key={tc.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(tc.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(tc.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--accent-gold)" }}>{tc.table.name}</td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--accent-gold)" }}>{formatMoney(tc.amount)}</td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tc.notes || "—"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{tc.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
