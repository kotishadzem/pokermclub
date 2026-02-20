"use client";

import { useEffect, useState, useCallback } from "react";

interface TxRecord {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  player: { firstName: string; lastName: string };
  user: { name: string };
}

interface ReportData {
  date: string;
  summary: {
    totalBuyIns: number;
    totalCashOuts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalRakebackPayouts: number;
    totalRake: number;
    transactionCount: number;
  };
  transactions: TxRecord[];
}

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

export default function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/transactions/reports?date=${date}`);
    setReport(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const s = report?.summary;
  const netFlow = s ? (s.totalBuyIns + s.totalDeposits) - (s.totalCashOuts + s.totalWithdrawals + s.totalRakebackPayouts) : 0;

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Daily Report</h1>
          <p className="mt-1 text-sm text-muted">{s ? `${s.transactionCount} transactions` : "Loading..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() - 1);
              setDate(d.toISOString().split("T")[0]);
            }}
            className="rounded-lg border border-card-border w-9 h-9 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm outline-none"
            style={{ color: "var(--foreground)", colorScheme: "dark" }}
          />
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() + 1);
              setDate(d.toISOString().split("T")[0]);
            }}
            className="rounded-lg border border-card-border w-9 h-9 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            ›
          </button>
          <button
            onClick={() => setDate(new Date().toISOString().split("T")[0])}
            className="rounded-lg border border-card-border px-3 py-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer ml-1"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted py-12">Loading...</div>
      ) : s && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Total Buy-ins</p>
              <p className="text-2xl font-bold" style={{ color: "var(--felt-green-light)" }}>${s.totalBuyIns.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Total Cash-outs</p>
              <p className="text-2xl font-bold" style={{ color: "var(--danger)" }}>${s.totalCashOuts.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Total Deposits</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-gold)" }}>${s.totalDeposits.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Total Withdrawals</p>
              <p className="text-2xl font-bold" style={{ color: "var(--muted)" }}>${s.totalWithdrawals.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Rake Collected</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-gold-dim)" }}>${s.totalRake.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border px-5 py-4" style={{ borderColor: netFlow >= 0 ? "rgba(26, 107, 69, 0.4)" : "rgba(199, 69, 69, 0.4)", backgroundColor: netFlow >= 0 ? "rgba(13, 74, 46, 0.15)" : "rgba(199, 69, 69, 0.08)" }}>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Net Flow</p>
              <p className="text-2xl font-bold" style={{ color: netFlow >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                {netFlow >= 0 ? "+" : ""}${netFlow.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-card-border">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">Transactions on {date}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Time</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Player</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Type</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Amount</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {report!.transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No transactions on this date</td></tr>
                ) : (
                  report!.transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                      <td className="px-5 py-2.5 text-muted text-xs whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-2.5 font-medium">{tx.player.firstName} {tx.player.lastName}</td>
                      <td className="px-5 py-2.5">
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                          style={{ color: typeColor(tx.type), backgroundColor: typeBadgeBg(tx.type) }}
                        >
                          {formatType(tx.type)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold" style={{ color: typeColor(tx.type) }}>
                        {tx.type === "CASH_OUT" || tx.type === "WITHDRAWAL" || tx.type === "RAKEBACK_PAYOUT" ? "-" : "+"}
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-2.5 text-muted text-xs">{tx.notes || "—"}</td>
                      <td className="px-5 py-2.5 text-muted text-xs">{tx.user.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
