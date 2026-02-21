"use client";

import { useEffect, useState, useCallback } from "react";

interface TxRecord {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  paymentMethod: string | null;
  createdAt: string;
  player: { id: string; firstName: string; lastName: string };
  user: { id: string; name: string };
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
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [limit, setLimit] = useState(50);

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
    if (t.type === "BUY_IN" || t.type === "DEPOSIT") return sum + t.amount;
    return sum - t.amount;
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
          {totalShown >= 0 ? "+" : ""}${totalShown.toFixed(2)}
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
                    ${tx.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">
                    {tx.paymentMethod === "BANK" ? "Bank" : "Cash"}
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
    </div>
  );
}
