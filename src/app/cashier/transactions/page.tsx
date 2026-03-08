"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  active: boolean;
}

interface BankAccountOption {
  id: string;
  name: string;
  active: boolean;
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

interface ExpenseTypeOption {
  id: string;
  name: string;
  isInternal: boolean;
}

interface ExpenseRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  bankAccountId: string | null;
  notes: string | null;
  createdAt: string;
  expenseType: { id: string; name: string };
  bankAccount: { id: string; name: string } | null;
  user: { id: string; name: string };
}

interface ExpensesReport {
  date: string;
  total: number;
  expenses: ExpenseRecord[];
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "BUY_IN", label: "Buy-in" },
  { value: "CASH_OUT", label: "Cash-out" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "RAKEBACK_PAYOUT", label: "Rakeback Payout" },
];

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

  // Expenses state
  const [expensesReport, setExpensesReport] = useState<ExpensesReport | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeOption[]>([]);
  const [editExpenseModalOpen, setEditExpenseModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRecord | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ expenseTypeId: "", amount: "", paymentMethod: "CASH", bankAccountId: "", notes: "" });
  const [editExpenseSubmitting, setEditExpenseSubmitting] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<TxRecord | null>(null);
  const [editForm, setEditForm] = useState({ type: "", amount: "", currencyId: "", paymentMethod: "CASH", bankAccountId: "", notes: "" });
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/tips").then(r => r.json()).then(setTipsReport).catch(() => {});
    fetch("/api/rake-collections").then(r => r.json()).then(setRakeReport).catch(() => {});
    fetch("/api/expenses").then(r => r.json()).then(setExpensesReport).catch(() => {});
    fetch("/api/expense-types").then(r => r.json()).then(setExpenseTypes).catch(() => {});
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

  function openEditModal(tx: TxRecord) {
    setEditTx(tx);
    setEditForm({
      type: tx.type,
      amount: tx.amount.toString(),
      currencyId: tx.currency?.id || "",
      paymentMethod: tx.paymentMethod || "CASH",
      bankAccountId: tx.bankAccount?.id || "",
      notes: tx.notes || "",
    });
    setEditModalOpen(true);
    // Fetch currencies and bank accounts
    fetch("/api/currencies").then(r => r.json()).then((list: CurrencyOption[]) => setCurrencies(list.filter(c => c.active))).catch(() => {});
    fetch("/api/bank-accounts").then(r => r.json()).then((list: BankAccountOption[]) => setBankAccounts(list.filter(b => b.active))).catch(() => {});
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTx) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          amount: parseFloat(editForm.amount),
          currencyId: editForm.currencyId || null,
          paymentMethod: editForm.paymentMethod,
          bankAccountId: editForm.paymentMethod === "BANK" ? editForm.bankAccountId : null,
          notes: editForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to update", type: "error" });
        setEditSubmitting(false);
        return;
      }
      setToast({ message: "Transaction updated", type: "success" });
      setEditModalOpen(false);
      setEditTx(null);
      fetchTransactions();
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
    setEditSubmitting(false);
  }

  // GEL conversion preview
  const selectedCurrency = currencies.find(c => c.id === editForm.currencyId);
  const editAmount = parseFloat(editForm.amount) || 0;
  const gelPreview = selectedCurrency ? editAmount * selectedCurrency.exchangeRate : editAmount;
  const showGelPreview = selectedCurrency && !selectedCurrency.isBase;

  function openEditExpenseModal(exp: ExpenseRecord) {
    setEditExpense(exp);
    setEditExpenseForm({
      expenseTypeId: exp.expenseType.id,
      amount: exp.amount.toString(),
      paymentMethod: exp.paymentMethod || "CASH",
      bankAccountId: exp.bankAccount?.id || "",
      notes: exp.notes || "",
    });
    setEditExpenseModalOpen(true);
    if (bankAccounts.length === 0) {
      fetch("/api/bank-accounts").then(r => r.json()).then((list: BankAccountOption[]) => setBankAccounts(list.filter(b => b.active))).catch(() => {});
    }
  }

  async function handleEditExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editExpense) return;
    setEditExpenseSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseTypeId: editExpenseForm.expenseTypeId,
          amount: parseFloat(editExpenseForm.amount),
          paymentMethod: editExpenseForm.paymentMethod,
          bankAccountId: editExpenseForm.paymentMethod === "BANK" ? editExpenseForm.bankAccountId : null,
          notes: editExpenseForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed to update", type: "error" });
        setEditExpenseSubmitting(false);
        return;
      }
      setToast({ message: "Expense updated", type: "success" });
      setEditExpenseModalOpen(false);
      setEditExpense(null);
      fetch("/api/expenses").then(r => r.json()).then(setExpensesReport).catch(() => {});
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
    setEditExpenseSubmitting(false);
  }

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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
              <th className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted w-16">Edit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">No transactions found</td></tr>
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
                  <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tx.notes || "\u2014"}</td>
                  <td className="px-5 py-3 text-muted text-xs">{tx.user.name}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-card-border/50 text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer"
                      title="Edit transaction"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                  </td>
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

      {/* Edit Transaction Modal — portaled to body to escape transform containing block */}
      {editModalOpen && editTx && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditModalOpen(false); setEditTx(null); } }}>
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
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Type & Amount row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Type</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm({ ...editForm, type: e.target.value })}
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
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
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
                  value={editForm.currencyId}
                  onChange={e => setEditForm({ ...editForm, currencyId: e.target.value })}
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
                    onClick={() => setEditForm({ ...editForm, paymentMethod: "CASH", bankAccountId: "" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editForm.paymentMethod === "CASH" ? {
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
                    onClick={() => setEditForm({ ...editForm, paymentMethod: "BANK" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editForm.paymentMethod === "BANK" ? {
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

              {/* Bank Account (conditional) */}
              {editForm.paymentMethod === "BANK" && (
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Bank Account</label>
                  <select
                    value={editForm.bankAccountId}
                    onChange={e => setEditForm({ ...editForm, bankAccountId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map(ba => (
                      <option key={ba.id} value={ba.id}>{ba.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>

              {/* Actions */}
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
                  onClick={() => { setEditModalOpen(false); setEditTx(null); }}
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
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{rc.notes || "\u2014"}</td>
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
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{tc.notes || "\u2014"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{tc.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {expensesReport && expensesReport.expenses.length > 0 && (
        <div className="mt-8" style={{ animation: "floatUp 0.4s ease-out" }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recent Expenses</h2>
            <p className="mt-1 text-sm text-muted">
              {expensesReport.expenses.length} expense{expensesReport.expenses.length !== 1 ? "s" : ""} — Total: <span style={{ color: "var(--danger)" }}>{formatMoney(expensesReport.total)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Date/Time</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Amount</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Payment</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Notes</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold tracking-wider uppercase text-muted w-16">Edit</th>
                </tr>
              </thead>
              <tbody>
                {expensesReport.expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(exp.createdAt).toLocaleDateString()}<br />
                      <span className="text-[10px]">{new Date(exp.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                        style={{ color: "var(--danger)", backgroundColor: "rgba(199, 69, 69, 0.15)" }}
                      >
                        {exp.expenseType.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--danger)" }}>
                      -{formatMoney(exp.amount)}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {exp.paymentMethod === "BANK" ? (exp.bankAccount ? `Bank - ${exp.bankAccount.name}` : "Bank") : "Cash"}
                    </td>
                    <td className="px-5 py-3 text-muted text-xs max-w-[200px] truncate">{exp.notes || "\u2014"}</td>
                    <td className="px-5 py-3 text-muted text-xs">{exp.user.name}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditExpenseModal(exp)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-card-border/50 text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer"
                        title="Edit expense"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editExpenseModalOpen && editExpense && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditExpenseModalOpen(false); setEditExpense(null); } }}>
          <div className="w-full max-w-lg rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                Edit Expense
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {editExpense.expenseType.name} &middot; {new Date(editExpense.createdAt).toLocaleDateString()}
              </p>
            </div>
            <form onSubmit={handleEditExpenseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Expense Type</label>
                  <select
                    value={editExpenseForm.expenseTypeId}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, expenseTypeId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  >
                    {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Amount</label>
                  <input
                    type="number"
                    value={editExpenseForm.amount}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Payment Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditExpenseForm({ ...editExpenseForm, paymentMethod: "CASH", bankAccountId: "" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editExpenseForm.paymentMethod === "CASH" ? {
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
                    onClick={() => setEditExpenseForm({ ...editExpenseForm, paymentMethod: "BANK" })}
                    className="flex-1 rounded-lg py-2 text-sm font-medium tracking-wider uppercase transition-all cursor-pointer"
                    style={editExpenseForm.paymentMethod === "BANK" ? {
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
              {editExpenseForm.paymentMethod === "BANK" && (
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Bank Account</label>
                  <select
                    value={editExpenseForm.bankAccountId}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, bankAccountId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map(ba => (
                      <option key={ba.id} value={ba.id}>{ba.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                <textarea
                  value={editExpenseForm.notes}
                  onChange={e => setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editExpenseSubmitting}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                >
                  {editExpenseSubmitting ? "Saving..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditExpenseModalOpen(false); setEditExpense(null); }}
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
