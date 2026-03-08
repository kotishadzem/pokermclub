"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCurrency } from "@/lib/currency";

interface BankAccount {
  id: string;
  name: string;
  active?: boolean;
}

interface OpeningBalanceRecord {
  id: string;
  date: string;
  time: string;
  channel: string;
  amount: number;
  user: { name: string };
}

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

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  active: boolean;
}

interface CollectionRecord {
  id: string;
  tableId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  table: { id: string; name: string };
  user: { name: string };
}

interface CollectionReport {
  date: string;
  grandTotal: number;
  byTable: { tableId: string; tableName: string; total: number; count: number }[];
  collections: CollectionRecord[];
}

interface TableOption {
  id: string;
  name: string;
}

const EDIT_TYPE_OPTIONS = [
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

// Pencil icon for edit buttons
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export default function CashierOpeningBalancesPage() {
  const { formatMoney } = useCurrency();
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

  // Daily activity state
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [rakeReport, setRakeReport] = useState<CollectionReport | null>(null);
  const [tipsReport, setTipsReport] = useState<CollectionReport | null>(null);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Transaction edit modal
  const [editTxOpen, setEditTxOpen] = useState(false);
  const [editTx, setEditTx] = useState<TxRecord | null>(null);
  const [editTxForm, setEditTxForm] = useState({ type: "", amount: "", currencyId: "", paymentMethod: "CASH", bankAccountId: "", notes: "" });
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Rake edit modal
  const [editRakeOpen, setEditRakeOpen] = useState(false);
  const [editRake, setEditRake] = useState<CollectionRecord | null>(null);
  const [editRakeForm, setEditRakeForm] = useState({ amount: "", tableId: "", notes: "" });

  // Tip edit modal
  const [editTipOpen, setEditTipOpen] = useState(false);
  const [editTip, setEditTip] = useState<CollectionRecord | null>(null);
  const [editTipForm, setEditTipForm] = useState({ amount: "", tableId: "", notes: "" });

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

  const fetchDailyActivity = useCallback(async () => {
    setTxLoading(true);
    const [txRes, rakeRes, tipsRes] = await Promise.all([
      fetch(`/api/transactions?from=${date}&to=${date}&limit=500`),
      fetch(`/api/rake-collections?date=${date}`),
      fetch(`/api/tips?date=${date}`),
    ]);
    setTransactions(await txRes.json());
    setRakeReport(await rakeRes.json());
    setTipsReport(await tipsRes.json());
    setTxLoading(false);
  }, [date]);

  useEffect(() => {
    fetchBankAccounts();
    fetch("/api/tables").then(r => r.json()).then(setTables).catch(() => {});
  }, [fetchBankAccounts]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);
  useEffect(() => { fetchDailyActivity(); }, [fetchDailyActivity]);

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

  // --- Transaction edit ---
  function openTxEditModal(tx: TxRecord) {
    setEditTx(tx);
    setEditTxForm({
      type: tx.type,
      amount: tx.amount.toString(),
      currencyId: tx.currency?.id || "",
      paymentMethod: tx.paymentMethod || "CASH",
      bankAccountId: tx.bankAccount?.id || "",
      notes: tx.notes || "",
    });
    setEditTxOpen(true);
    fetch("/api/currencies").then(r => r.json()).then((list: CurrencyOption[]) => setCurrencies(list.filter(c => c.active))).catch(() => {});
  }

  async function handleTxEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTx) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editTxForm.type,
          amount: parseFloat(editTxForm.amount),
          currencyId: editTxForm.currencyId || null,
          paymentMethod: editTxForm.paymentMethod,
          bankAccountId: editTxForm.paymentMethod === "BANK" ? editTxForm.bankAccountId : null,
          notes: editTxForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to update", type: "error" });
      } else {
        setToast({ message: "Transaction updated", type: "success" });
        setEditTxOpen(false);
        setEditTx(null);
        fetchDailyActivity();
      }
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
    setEditSubmitting(false);
  }

  const selectedCurrency = currencies.find(c => c.id === editTxForm.currencyId);
  const editAmount = parseFloat(editTxForm.amount) || 0;
  const gelPreview = selectedCurrency ? editAmount * selectedCurrency.exchangeRate : editAmount;
  const showGelPreview = selectedCurrency && !selectedCurrency.isBase;

  // --- Rake edit ---
  function openRakeEditModal(rc: CollectionRecord) {
    setEditRake(rc);
    setEditRakeForm({ amount: rc.amount.toString(), tableId: rc.tableId, notes: rc.notes || "" });
    setEditRakeOpen(true);
  }

  async function handleRakeEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRake) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/rake-collections/${editRake.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editRakeForm.amount),
          tableId: editRakeForm.tableId,
          notes: editRakeForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to update", type: "error" });
      } else {
        setToast({ message: "Rake collection updated", type: "success" });
        setEditRakeOpen(false);
        setEditRake(null);
        fetchDailyActivity();
      }
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
    setEditSubmitting(false);
  }

  // --- Tip edit ---
  function openTipEditModal(tc: CollectionRecord) {
    setEditTip(tc);
    setEditTipForm({ amount: tc.amount.toString(), tableId: tc.tableId, notes: tc.notes || "" });
    setEditTipOpen(true);
  }

  async function handleTipEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTip) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/tips/${editTip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editTipForm.amount),
          tableId: editTipForm.tableId,
          notes: editTipForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to update", type: "error" });
      } else {
        setToast({ message: "Tip collection updated", type: "success" });
        setEditTipOpen(false);
        setEditTip(null);
        fetchDailyActivity();
      }
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
    setEditSubmitting(false);
  }

  const activeBankAccounts = bankAccounts.filter(b => !('active' in b) || b.active);

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
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden mb-8">
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
                    {formatMoney(ob.amount)}
                  </td>
                  <td className="px-5 py-3 text-muted">{ob.time}</td>
                  <td className="px-5 py-3 text-muted">{ob.user.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== DAILY ACTIVITY SECTIONS ===== */}

      {/* Transactions */}
      <div className="mb-8" style={{ animation: "floatUp 0.4s ease-out" }}>
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Transactions</h2>
          <p className="mt-1 text-sm text-muted">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""} on {date}</p>
        </div>
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
                <th className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">No transactions for this date</td></tr>
              ) : (
                transactions.map(tx => (
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
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tx.notes || "\u2014"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{tx.user.name}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openTxEditModal(tx)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-card-border/50 text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer"
                        title="Edit transaction"
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rake Collections */}
      <div className="mb-8" style={{ animation: "floatUp 0.4s ease-out" }}>
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Rake Collections</h2>
          <p className="mt-1 text-sm text-muted">
            {rakeReport?.collections.length || 0} collection{(rakeReport?.collections.length || 0) !== 1 ? "s" : ""} — Total: <span style={{ color: "var(--felt-green-light)" }}>{formatMoney(rakeReport?.grandTotal || 0)}</span>
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
                <th className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
              ) : !rakeReport || rakeReport.collections.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No rake collections for this date</td></tr>
              ) : (
                rakeReport.collections.map(rc => (
                  <tr key={rc.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(rc.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(rc.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--felt-green-light)" }}>{rc.table.name}</td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--felt-green-light)" }}>{formatMoney(rc.amount)}</td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{rc.notes || "\u2014"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{rc.user.name}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openRakeEditModal(rc)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-card-border/50 text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer"
                        title="Edit rake collection"
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tip Collections */}
      <div className="mb-8" style={{ animation: "floatUp 0.4s ease-out" }}>
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Tip Collections</h2>
          <p className="mt-1 text-sm text-muted">
            {tipsReport?.collections.length || 0} tip{(tipsReport?.collections.length || 0) !== 1 ? "s" : ""} — Total: <span style={{ color: "var(--accent-gold)" }}>{formatMoney(tipsReport?.grandTotal || 0)}</span>
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
                <th className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
              ) : !tipsReport || tipsReport.collections.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No tip collections for this date</td></tr>
              ) : (
                tipsReport.collections.map(tc => (
                  <tr key={tc.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(tc.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(tc.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--accent-gold)" }}>{tc.table.name}</td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--accent-gold)" }}>{formatMoney(tc.amount)}</td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tc.notes || "\u2014"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{tc.user.name}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openTipEditModal(tc)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-card-border/50 text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer"
                        title="Edit tip collection"
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODALS (portaled to body) ===== */}

      {/* Transaction Edit Modal */}
      {editTxOpen && editTx && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditTxOpen(false); setEditTx(null); } }}>
          <div className="w-full max-w-lg rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                  Edit Transaction
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {editTx.player.firstName} {editTx.player.lastName} &middot; {new Date(editTx.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <form onSubmit={handleTxEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Type</label>
                  <select
                    value={editTxForm.type}
                    onChange={e => setEditTxForm({ ...editTxForm, type: e.target.value })}
                    required
                    className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  >
                    {EDIT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Amount</label>
                  <input
                    type="number"
                    value={editTxForm.amount}
                    onChange={e => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Currency</label>
                <select
                  value={editTxForm.currencyId}
                  onChange={e => setEditTxForm({ ...editTxForm, currencyId: e.target.value })}
                  className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                >
                  <option value="">GEL (Base)</option>
                  {currencies.filter(c => !c.isBase).map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name} (1 = {c.exchangeRate} GEL)</option>
                  ))}
                </select>
                {showGelPreview && editAmount > 0 && (
                  <div
                    className="mt-2 rounded-lg px-3 py-2 text-xs"
                    style={{ backgroundColor: "rgba(201, 168, 76, 0.08)", border: "1px solid rgba(201, 168, 76, 0.2)" }}
                  >
                    <span className="text-muted">{selectedCurrency.symbol} {editAmount.toFixed(2)}</span>
                    <span className="text-muted mx-1.5">=</span>
                    <span className="font-semibold" style={{ color: "var(--accent-gold)" }}>GEL {gelPreview.toFixed(2)}</span>
                    <span className="text-muted ml-1.5 text-[10px]">(rate: {selectedCurrency.exchangeRate})</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Payment Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTxForm({ ...editTxForm, paymentMethod: "CASH", bankAccountId: "" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editTxForm.paymentMethod === "CASH" ? {
                      background: "rgba(13, 74, 46, 0.25)",
                      border: "1px solid rgba(26, 107, 69, 0.5)",
                      color: "var(--felt-green-light)",
                    } : {
                      background: "transparent",
                      border: "1px solid var(--card-border)",
                      color: "var(--muted)",
                    }}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTxForm({ ...editTxForm, paymentMethod: "BANK" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editTxForm.paymentMethod === "BANK" ? {
                      background: "rgba(13, 74, 46, 0.25)",
                      border: "1px solid rgba(26, 107, 69, 0.5)",
                      color: "var(--felt-green-light)",
                    } : {
                      background: "transparent",
                      border: "1px solid var(--card-border)",
                      color: "var(--muted)",
                    }}
                  >
                    Bank
                  </button>
                </div>
              </div>

              {editTxForm.paymentMethod === "BANK" && (
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Bank Account</label>
                  <select
                    value={editTxForm.bankAccountId}
                    onChange={e => setEditTxForm({ ...editTxForm, bankAccountId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="">Select bank account...</option>
                    {activeBankAccounts.map(ba => (
                      <option key={ba.id} value={ba.id}>{ba.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                <textarea
                  value={editTxForm.notes}
                  onChange={e => setEditTxForm({ ...editTxForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                >
                  {editSubmitting ? "Saving..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditTxOpen(false); setEditTx(null); }}
                  className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Rake Edit Modal */}
      {editRakeOpen && editRake && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditRakeOpen(false); setEditRake(null); } }}>
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                Edit Rake Collection
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {editRake.table.name} &middot; {new Date(editRake.createdAt).toLocaleDateString()}
              </p>
            </div>
            <form onSubmit={handleRakeEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Amount</label>
                <input
                  type="number"
                  value={editRakeForm.amount}
                  onChange={e => setEditRakeForm({ ...editRakeForm, amount: e.target.value })}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Table</label>
                <select
                  value={editRakeForm.tableId}
                  onChange={e => setEditRakeForm({ ...editRakeForm, tableId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                >
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                <textarea
                  value={editRakeForm.notes}
                  onChange={e => setEditRakeForm({ ...editRakeForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                >
                  {editSubmitting ? "Saving..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditRakeOpen(false); setEditRake(null); }}
                  className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Tip Edit Modal */}
      {editTipOpen && editTip && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditTipOpen(false); setEditTip(null); } }}>
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                Edit Tip Collection
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {editTip.table.name} &middot; {new Date(editTip.createdAt).toLocaleDateString()}
              </p>
            </div>
            <form onSubmit={handleTipEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Amount</label>
                <input
                  type="number"
                  value={editTipForm.amount}
                  onChange={e => setEditTipForm({ ...editTipForm, amount: e.target.value })}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Table</label>
                <select
                  value={editTipForm.tableId}
                  onChange={e => setEditTipForm({ ...editTipForm, tableId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                >
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                <textarea
                  value={editTipForm.notes}
                  onChange={e => setEditTipForm({ ...editTipForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                >
                  {editSubmitting ? "Saving..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditTipOpen(false); setEditTip(null); }}
                  className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
