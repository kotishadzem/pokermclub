"use client";

import { useEffect, useState, useCallback } from "react";

interface TxRecord {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  paymentMethod: string | null;
  bankAccount: { id: string; name: string } | null;
  createdAt: string;
  player: { firstName: string; lastName: string };
  user: { name: string };
}

interface ChannelData {
  name: string;
  icon: "cash" | "bank" | "deposit";
  opening: number;
  in: number;
  out: number;
  net: number;
  balance: number;
}

interface ReportData {
  date: string;
  summary: {
    totalBuyIns: number;
    totalBuyInsCash: number;
    totalBuyInsBank: number;
    totalCashOuts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalRakebackPayouts: number;
    totalRake: number;
    transactionCount: number;
  };
  channels: ChannelData[];
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
  const channels = report?.channels || [];
  const totalNet = channels.reduce((sum, ch) => sum + ch.balance, 0);

  const channelIcon = (icon: string) => {
    if (icon === "cash") return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M2 10h2M20 10h2M2 14h2M20 14h2" />
      </svg>
    );
    if (icon === "bank") return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  };

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
          {/* Channel Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {channels.map((ch, i) => (
              <div
                key={i}
                className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden"
                style={{ animationDelay: `${i * 60}ms`, animation: "floatUp 0.4s ease-out forwards", opacity: 0 }}
              >
                {/* Channel header */}
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-card-border/60">
                  <span style={{ color: ch.icon === "cash" ? "var(--felt-green-light)" : ch.icon === "bank" ? "var(--accent-gold)" : "var(--muted)" }}>
                    {channelIcon(ch.icon)}
                  </span>
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--foreground)" }}>
                    {ch.name}
                  </span>
                </div>
                {/* OPENING / IN / OUT / BALANCE row */}
                <div className="grid grid-cols-4 divide-x divide-card-border/40">
                  <div className="px-4 py-3.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-1">OPENING</p>
                    <p className="text-lg font-bold" style={{ color: "var(--accent-gold-dim)" }}>
                      ${ch.opening.toFixed(2)}
                    </p>
                  </div>
                  <div className="px-4 py-3.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-1">IN</p>
                    <p className="text-lg font-bold" style={{ color: "var(--felt-green-light)" }}>
                      ${ch.in.toFixed(2)}
                    </p>
                  </div>
                  <div className="px-4 py-3.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-1">OUT</p>
                    <p className="text-lg font-bold" style={{ color: "var(--danger)" }}>
                      ${ch.out.toFixed(2)}
                    </p>
                  </div>
                  <div className="px-4 py-3.5 text-center" style={{ backgroundColor: ch.balance >= 0 ? "rgba(13, 74, 46, 0.08)" : "rgba(199, 69, 69, 0.05)" }}>
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-1">BALANCE</p>
                    <p className="text-lg font-bold" style={{ color: ch.balance >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                      ${ch.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rake + Total Net */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Rake Collected</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-gold-dim)" }}>${s.totalRake.toFixed(2)}</p>
            </div>
            <div
              className="rounded-xl border px-5 py-4"
              style={{
                borderColor: totalNet >= 0 ? "rgba(26, 107, 69, 0.4)" : "rgba(199, 69, 69, 0.4)",
                backgroundColor: totalNet >= 0 ? "rgba(13, 74, 46, 0.15)" : "rgba(199, 69, 69, 0.08)",
              }}
            >
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1.5">Total Balance</p>
              <p className="text-2xl font-bold" style={{ color: totalNet >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                {totalNet >= 0 ? "+" : "-"}${Math.abs(totalNet).toFixed(2)}
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
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Payment</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {report!.transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No transactions on this date</td></tr>
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
                      <td className="px-5 py-2.5 text-xs text-muted">
                        {tx.paymentMethod === "BANK" ? (tx.bankAccount ? `Bank - ${tx.bankAccount.name}` : "Bank") : "Cash"}
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
