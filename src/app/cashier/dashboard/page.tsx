"use client";

import { useEffect, useState, useCallback } from "react";

interface PlayerOption {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  status?: { name: string } | null;
}
interface PlayerDetail extends PlayerOption {
  transactions: TxRecord[];
}
interface TxRecord {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  user?: { name: string };
}
interface DayReport {
  summary: {
    totalBuyIns: number;
    totalCashOuts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalRakebackPayouts: number;
    totalRake: number;
    transactionCount: number;
  };
}

type ActionType = "BUY_IN" | "CASH_OUT" | "DEPOSIT" | "WITHDRAWAL";

const ACTION_META: Record<ActionType, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  BUY_IN:     { label: "Buy-in",     icon: "↓", color: "var(--felt-green-light)", bgColor: "rgba(13, 74, 46, 0.2)", borderColor: "rgba(26, 107, 69, 0.3)" },
  CASH_OUT:   { label: "Cash-out",   icon: "↑", color: "var(--danger)",          bgColor: "rgba(199, 69, 69, 0.12)", borderColor: "rgba(199, 69, 69, 0.25)" },
  DEPOSIT:    { label: "Deposit",    icon: "◆", color: "var(--accent-gold)",     bgColor: "rgba(201, 168, 76, 0.1)", borderColor: "rgba(201, 168, 76, 0.25)" },
  WITHDRAWAL: { label: "Withdrawal", icon: "◇", color: "var(--muted)",           bgColor: "rgba(107, 124, 116, 0.12)", borderColor: "rgba(107, 124, 116, 0.25)" },
};

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: "rgba(26, 107, 69, 0.5)", backgroundColor: "rgba(13, 74, 46, 0.9)", color: "var(--foreground)" }}>
      {message}
    </div>
  );
}

export default function CashierDashboard() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [dayReport, setDayReport] = useState<DayReport | null>(null);

  // Fetch today's summary
  useEffect(() => {
    fetch("/api/transactions/reports").then(r => r.json()).then(setDayReport).catch(() => {});
  }, []);

  // Player search debounce
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${search}`);
      setResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const selectPlayer = useCallback(async (p: PlayerOption) => {
    setSearch("");
    setResults([]);
    setActiveAction(null);
    const res = await fetch(`/api/players/${p.id}`);
    setSelectedPlayer(await res.json());
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (!selectedPlayer) return;
    const res = await fetch(`/api/players/${selectedPlayer.id}`);
    setSelectedPlayer(await res.json());
    // Also refresh day report
    fetch("/api/transactions/reports").then(r => r.json()).then(setDayReport).catch(() => {});
  }, [selectedPlayer]);

  async function submitTransaction() {
    if (!selectedPlayer || !activeAction || !amount) return;
    setSubmitting(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: selectedPlayer.id,
        type: activeAction,
        amount: parseFloat(amount),
        notes: notes || null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const meta = ACTION_META[activeAction];
      setToast(`${meta.label} of $${parseFloat(amount).toFixed(2)} recorded`);
      setActiveAction(null);
      setAmount("");
      setNotes("");
      refreshPlayer();
    }
  }

  // Calculate balance from transactions
  function calcBalance(txs: TxRecord[]): number {
    return txs.reduce((bal, t) => {
      if (t.type === "BUY_IN" || t.type === "DEPOSIT") return bal + t.amount;
      return bal - t.amount;
    }, 0);
  }

  function formatType(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function typeColor(type: string): string {
    if (type === "BUY_IN" || type === "DEPOSIT") return "var(--felt-green-light)";
    if (type === "CASH_OUT" || type === "WITHDRAWAL") return "var(--danger)";
    return "var(--accent-gold)";
  }

  const summary = dayReport?.summary;

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Cashier</h1>
        <p className="mt-1 text-sm text-muted">Transaction management</p>
      </div>

      {/* Today's Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" style={{ animation: "floatUp 0.4s ease-out" }}>
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Today Buy-ins</p>
            <p className="text-lg font-bold" style={{ color: "var(--felt-green-light)" }}>${summary.totalBuyIns.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Today Cash-outs</p>
            <p className="text-lg font-bold" style={{ color: "var(--danger)" }}>${summary.totalCashOuts.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Transactions</p>
            <p className="text-lg font-bold" style={{ color: "var(--accent-gold)" }}>{summary.transactionCount}</p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Rake Collected</p>
            <p className="text-lg font-bold" style={{ color: "var(--accent-gold-dim)" }}>${summary.totalRake.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Player Search */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-5 mb-6">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Find Player</h3>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full rounded-lg border border-card-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent-gold/50 transition-colors"
            style={{ color: "var(--foreground)" }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">⌕</span>
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-card-border bg-card-bg shadow-2xl max-h-48 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPlayer(p)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-felt-green/20 transition-colors cursor-pointer border-b border-card-border/50 last:border-0 flex items-center gap-3"
                >
                  {p.photo ? (
                    <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-card-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                      {p.firstName[0]}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    {p.status && <span className="ml-2 text-xs text-accent-gold-dim">({p.status.name})</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Player */}
      {selectedPlayer && (
        <div style={{ animation: "floatUp 0.3s ease-out" }}>
          {/* Player Card */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 p-5 mb-4">
            <div className="flex items-center gap-4 mb-4">
              {selectedPlayer.photo ? (
                <img src={selectedPlayer.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-card-border" />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                  {selectedPlayer.firstName[0]}{selectedPlayer.lastName[0]}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {selectedPlayer.firstName} {selectedPlayer.lastName}
                </h2>
                {selectedPlayer.status && (
                  <span className="text-xs text-accent-gold-dim tracking-wider uppercase">{selectedPlayer.status.name}</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Balance</p>
                <p className="text-xl font-bold" style={{ color: calcBalance(selectedPlayer.transactions) >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                  ${calcBalance(selectedPlayer.transactions).toFixed(2)}
                </p>
              </div>
              <button onClick={() => { setSelectedPlayer(null); setActiveAction(null); }} className="text-muted hover:text-foreground cursor-pointer ml-2">✕</button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(Object.keys(ACTION_META) as ActionType[]).map(type => {
                const meta = ACTION_META[type];
                const isActive = activeAction === type;
                return (
                  <button
                    key={type}
                    onClick={() => { setActiveAction(isActive ? null : type); setAmount(""); setNotes(""); }}
                    className="rounded-lg border px-4 py-3 text-sm font-semibold tracking-wider uppercase cursor-pointer transition-all duration-200"
                    style={{
                      borderColor: isActive ? meta.color : meta.borderColor,
                      backgroundColor: isActive ? meta.bgColor : "transparent",
                      color: meta.color,
                      boxShadow: isActive ? `0 0 12px ${meta.bgColor}` : "none",
                    }}
                  >
                    <span className="mr-1.5">{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Transaction Form */}
            {activeAction && (
              <div className="mt-4 pt-4 border-t border-card-border" style={{ animation: "floatUp 0.2s ease-out" }}>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Amount ($)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                      style={{ color: "var(--foreground)" }}
                      autoFocus
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                      style={{ color: "var(--foreground)" }}
                    />
                  </div>
                  <button
                    onClick={submitTransaction}
                    disabled={!amount || parseFloat(amount) <= 0 || submitting}
                    className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
                    style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                  >
                    {submitting ? "..." : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-card-border">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">Recent Transactions</h3>
            </div>
            {selectedPlayer.transactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted text-sm">No transactions yet</div>
            ) : (
              selectedPlayer.transactions.map(tx => (
                <div key={tx.id} className="flex items-center px-5 py-3 border-b border-card-border/50 last:border-0 hover:bg-card-border/20 transition-colors">
                  <div className="flex-1">
                    <span className="text-sm font-medium" style={{ color: typeColor(tx.type) }}>
                      {formatType(tx.type)}
                    </span>
                    {tx.notes && <span className="ml-2 text-xs text-muted">— {tx.notes}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: typeColor(tx.type) }}>
                      {tx.type === "CASH_OUT" || tx.type === "WITHDRAWAL" || tx.type === "RAKEBACK_PAYOUT" ? "-" : "+"}${tx.amount.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-muted">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedPlayer && (
        <div className="rounded-xl border border-card-border bg-card-bg/40 p-12 flex flex-col items-center justify-center text-center" style={{ animation: "floatUp 0.4s ease-out" }}>
          <span className="text-4xl text-accent-gold-dim/30 mb-3">◈</span>
          <p className="text-sm text-muted">Search for a player to start a transaction</p>
        </div>
      )}
    </div>
  );
}
