"use client";

import { useEffect, useState, useCallback } from "react";

interface BankAccount {
  id: string;
  name: string;
}

interface OpeningBalanceRecord {
  id: string;
  date: string;
  time: string;
  channel: string;
  amount: number;
  user: { name: string };
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl backdrop-blur-sm"
      style={{
        animation: "floatUp 0.3s ease-out",
        borderColor: type === "success" ? "rgba(26, 107, 69, 0.5)" : "rgba(199, 69, 69, 0.5)",
        backgroundColor: type === "success" ? "rgba(13, 74, 46, 0.9)" : "rgba(120, 30, 30, 0.9)",
        color: "var(--foreground)",
      }}
    >
      {message}
    </div>
  );
}

export default function OpeningBalancesPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [cashAmount, setCashAmount] = useState("");
  const [depositsAmount, setDepositsAmount] = useState("");
  const [bankAmounts, setBankAmounts] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [saved, setSaved] = useState<OpeningBalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchBankAccounts = useCallback(async () => {
    const res = await fetch("/api/bank-accounts");
    const data = await res.json();
    setBankAccounts(data);
  }, []);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/opening-balances?date=${date}`);
    const data: OpeningBalanceRecord[] = await res.json();
    setSaved(data);

    // Pre-fill form from saved data
    let foundCash = false;
    let foundDeposits = false;
    const bankAmts: Record<string, string> = {};

    for (const ob of data) {
      if (ob.channel === "CASH") {
        setCashAmount(String(ob.amount));
        foundCash = true;
      } else if (ob.channel === "DEPOSITS") {
        setDepositsAmount(String(ob.amount));
        foundDeposits = true;
      } else {
        bankAmts[ob.channel] = String(ob.amount);
      }
    }

    if (!foundCash) setCashAmount("");
    if (!foundDeposits) setDepositsAmount("");
    setBankAmounts(bankAmts);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchBankAccounts(); }, [fetchBankAccounts]);
  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  async function handleSave() {
    setSaving(true);
    try {
      const balances: { channel: string; amount: number }[] = [];

      balances.push({ channel: "CASH", amount: parseFloat(cashAmount) || 0 });
      balances.push({ channel: "DEPOSITS", amount: parseFloat(depositsAmount) || 0 });

      for (const ba of bankAccounts) {
        balances.push({ channel: ba.id, amount: parseFloat(bankAmounts[ba.id] || "0") || 0 });
      }

      const res = await fetch("/api/opening-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, balances }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to save", type: "error" });
      } else {
        setToast({ message: "Opening balances saved", type: "success" });
        fetchBalances();
      }
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
    setSaving(false);
  }

  function channelLabel(channel: string): string {
    if (channel === "CASH") return "Cash";
    if (channel === "DEPOSITS") return "Deposits";
    const ba = bankAccounts.find((b) => b.id === channel);
    return ba ? ba.name : channel;
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Opening Balances</h1>
          <p className="mt-1 text-sm text-muted">Set starting balances for each channel</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-6 mb-6">
        {/* Date & Time */}
        <div className="flex gap-4 mb-5">
          <div className="flex-1">
            <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
              style={{ color: "var(--foreground)", colorScheme: "dark" }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
              style={{ color: "var(--foreground)", colorScheme: "dark" }}
            />
          </div>
        </div>

        {/* Channel Inputs */}
        <div className="space-y-3">
          {/* Cash */}
          <div className="flex items-center gap-4 rounded-lg border border-card-border/60 px-4 py-3">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span style={{ color: "var(--felt-green-light)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M2 10h2M20 10h2M2 14h2M20 14h2" />
                </svg>
              </span>
              <span className="text-sm font-semibold tracking-wider uppercase">Cash</span>
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-card-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent-gold/50"
              style={{ color: "var(--foreground)" }}
            />
          </div>

          {/* Bank Accounts */}
          {bankAccounts.map((ba) => (
            <div key={ba.id} className="flex items-center gap-4 rounded-lg border border-card-border/60 px-4 py-3">
              <div className="flex items-center gap-2 min-w-[140px]">
                <span style={{ color: "var(--accent-gold)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                </span>
                <span className="text-sm font-semibold tracking-wider uppercase">{ba.name}</span>
              </div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={bankAmounts[ba.id] || ""}
                onChange={(e) => setBankAmounts({ ...bankAmounts, [ba.id]: e.target.value })}
                placeholder="0.00"
                className="flex-1 rounded-lg border border-card-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent-gold/50"
                style={{ color: "var(--foreground)" }}
              />
            </div>
          ))}

          {/* Deposits */}
          <div className="flex items-center gap-4 rounded-lg border border-card-border/60 px-4 py-3">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span style={{ color: "var(--muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </span>
              <span className="text-sm font-semibold tracking-wider uppercase">Deposits</span>
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={depositsAmount}
              onChange={(e) => setDepositsAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-card-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent-gold/50"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
          >
            {saving ? "Saving..." : "Save Balances"}
          </button>
        </div>
      </div>

      {/* Saved Balances Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-card-border">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">Saved Balances for {date}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Channel</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Time</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Set By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : saved.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No opening balances set for this date</td></tr>
            ) : (
              saved.map((ob) => (
                <tr key={ob.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 font-medium">{channelLabel(ob.channel)}</td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--accent-gold)" }}>
                    ${ob.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-muted">{ob.time}</td>
                  <td className="px-5 py-3 text-muted">{ob.user.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
