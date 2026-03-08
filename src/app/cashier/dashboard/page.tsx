"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiveData } from "@/lib/use-live-data";
import { useCurrency } from "@/lib/currency";

interface TableOption {
  id: string;
  name: string;
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

interface BankAccountOption {
  id: string;
  name: string;
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
  notes: string | null;
  createdAt: string;
  expenseType: { id: string; name: string };
  bankAccount: { id: string; name: string } | null;
  user: { name: string };
}

interface ExpensesReport {
  date: string;
  total: number;
  expenses: ExpenseRecord[];
}

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
}

interface ChipOption {
  id: string;
  denomination: number;
  quantity: number;
  color: string | null;
}

const CHIP_COLOR_HEX: Record<string, string> = {
  white: "#e8e8e8", red: "#c74545", blue: "#3b6fc4", green: "#1a6b45",
  black: "#2a2a2a", purple: "#7b4bb3", yellow: "#c9a84c", orange: "#d4802a", pink: "#d45c8c",
};

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
  amountInGel: number | null;
  currencyCode: string;
  notes: string | null;
  createdAt: string;
  user?: { name: string };
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
interface DayReport {
  summary: {
    totalBuyIns: number;
    totalBuyInsCash: number;
    totalBuyInsBank: number;
    totalCashOuts: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalRakebackPayouts: number;
    totalRake: number;
    totalTipsCollected: number;
    transactionCount: number;
  };
  channels: ChannelData[];
}

type ActionType = "BUY_IN" | "CASH_OUT" | "DEPOSIT" | "WITHDRAWAL";

const ACTION_META: Record<ActionType, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  BUY_IN:     { label: "Buy-in",     icon: "↓", color: "var(--felt-green-light)", bgColor: "rgba(13, 74, 46, 0.2)", borderColor: "rgba(26, 107, 69, 0.3)" },
  CASH_OUT:   { label: "Cash-out",   icon: "↑", color: "var(--danger)",          bgColor: "rgba(199, 69, 69, 0.12)", borderColor: "rgba(199, 69, 69, 0.25)" },
  DEPOSIT:    { label: "Deposit",    icon: "◆", color: "var(--accent-gold)",     bgColor: "rgba(201, 168, 76, 0.1)", borderColor: "rgba(201, 168, 76, 0.25)" },
  WITHDRAWAL: { label: "Withdrawal", icon: "◇", color: "var(--muted)",           bgColor: "rgba(107, 124, 116, 0.12)", borderColor: "rgba(107, 124, 116, 0.25)" },
};

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
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

export default function CashierDashboard() {
  const { formatMoney, currency } = useCurrency();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [dayReport, setDayReport] = useState<DayReport | null>(null);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [chips, setChips] = useState<ChipOption[]>([]);
  const [chipQuantities, setChipQuantities] = useState<Record<string, number>>({});

  // Tips collection state
  const [tables, setTables] = useState<TableOption[]>([]);
  const [tipsReport, setTipsReport] = useState<TipsReport | null>(null);
  const [tipTableId, setTipTableId] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipNotes, setTipNotes] = useState("");
  const [submittingTip, setSubmittingTip] = useState(false);

  // Rake collection state
  const [rakeReport, setRakeReport] = useState<RakeReport | null>(null);
  const [rakeTableId, setRakeTableId] = useState("");
  const [rakeAmount, setRakeAmount] = useState("");
  const [rakeNotes, setRakeNotes] = useState("");
  const [rakeChipQuantities, setRakeChipQuantities] = useState<Record<string, number>>({});
  const [submittingRake, setSubmittingRake] = useState(false);
  const [tipChipQuantities, setTipChipQuantities] = useState<Record<string, number>>({});

  // Chip inventory state
  const [chipInventory, setChipInventory] = useState<{ chipId: string; denomination: number; color: string | null; total: number; cashier: number; field: number }[]>([]);

  // Expense state
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeOption[]>([]);
  const [expensesReport, setExpensesReport] = useState<ExpensesReport | null>(null);
  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<"CASH" | "BANK">("CASH");
  const [expenseBankAccountId, setExpenseBankAccountId] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseChipQuantities, setExpenseChipQuantities] = useState<Record<string, number>>({});
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Fetch today's summary + tips (live-polled)
  const fetchReport = useCallback(async () => {
    const [reportRes, tipsRes, rakeRes, expensesRes, inventoryRes] = await Promise.all([
      fetch("/api/transactions/reports"),
      fetch("/api/tips"),
      fetch("/api/rake-collections"),
      fetch("/api/expenses"),
      fetch("/api/chips/inventory"),
    ]);
    setDayReport(await reportRes.json());
    setTipsReport(await tipsRes.json());
    setRakeReport(await rakeRes.json());
    setExpensesReport(await expensesRes.json());
    const invData = await inventoryRes.json();
    if (invData.chips) setChipInventory(invData.chips);
  }, []);

  useLiveData(fetchReport, 5000);

  // Fetch bank accounts, tables, currencies on mount
  useEffect(() => {
    fetch("/api/bank-accounts").then(r => r.json()).then(setBankAccounts).catch(() => {});
    fetch("/api/tables").then(r => r.json()).then((data: TableOption[]) => setTables(data)).catch(() => {});
    fetch("/api/chips").then(r => r.json()).then((data: ChipOption[]) => setChips(data)).catch(() => {});
    fetch("/api/expense-types").then(r => r.json()).then((data: ExpenseTypeOption[]) => setExpenseTypes(data)).catch(() => {});
    fetch("/api/currencies").then(r => r.json()).then((data: CurrencyOption[]) => {
      setCurrencies(data);
      const base = data.find(c => c.isBase);
      if (base) setSelectedCurrencyId(base.id);
    }).catch(() => {});
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

  // Chip breakdown helpers
  const showChipBreakdown = (activeAction === "BUY_IN" || activeAction === "CASH_OUT") && chips.length > 0;
  const chipTotal = chips.reduce((sum, c) => sum + c.denomination * (chipQuantities[c.id] || 0), 0);
  const hasChipEntries = Object.values(chipQuantities).some(q => q > 0);

  function setChipQty(chipId: string, qty: number) {
    const newQuantities = { ...chipQuantities, [chipId]: Math.max(0, qty) };
    setChipQuantities(newQuantities);
    // Auto-fill amount from chip total
    const total = chips.reduce((sum, c) => sum + c.denomination * (newQuantities[c.id] || 0), 0);
    if (total > 0) {
      setAmount(total.toString());
    } else {
      setAmount("");
    }
  }

  // Payment splits helpers
  const splitsTotal = Object.values(splitAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const hasSplitEntries = Object.values(splitAmounts).some(v => parseFloat(v) > 0);
  const splitsMatchAmount = amount ? Math.abs(splitsTotal - parseFloat(amount)) < 0.01 : false;
  const isDepositWithdrawal = activeAction === "DEPOSIT" || activeAction === "WITHDRAWAL";

  function setSplitAmount(channel: string, value: string) {
    setSplitAmounts(prev => ({ ...prev, [channel]: value }));
  }

  async function submitTransaction() {
    if (!selectedPlayer || !activeAction || !amount) return;
    setSubmitting(true);
    try {
      const selectedCurr = currencies.find(c => c.id === selectedCurrencyId);

      // Build payment splits from the split amounts
      const splits = !isDepositWithdrawal ? Object.entries(splitAmounts)
        .filter(([, amt]) => amt && parseFloat(amt) > 0)
        .map(([channel, amt]) => ({
          channel,
          channelName: channel === "CASH" ? "Cash" : bankAccounts.find(b => b.id === channel)?.name || "Bank",
          amount: parseFloat(amt),
        })) : undefined;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          type: activeAction,
          amount: parseFloat(amount),
          notes: notes || null,
          currencyId: selectedCurr && !selectedCurr.isBase ? selectedCurr.id : undefined,
          chipBreakdown: hasChipEntries ? chips.filter(c => (chipQuantities[c.id] || 0) > 0).map(c => ({
            chipId: c.id,
            denomination: c.denomination,
            color: c.color,
            quantity: chipQuantities[c.id],
            subtotal: c.denomination * chipQuantities[c.id],
          })) : null,
          paymentSplits: splits && splits.length > 0 ? splits : undefined,
        }),
      });
      if (res.ok) {
        const meta = ACTION_META[activeAction];
        const gelAmt = selectedCurr && !selectedCurr.isBase ? parseFloat(amount) * selectedCurr.exchangeRate : parseFloat(amount);
        const currLabel = selectedCurr && !selectedCurr.isBase ? ` (${selectedCurr.code} ${parseFloat(amount).toFixed(2)})` : "";
        setToast({ message: `${meta.label} of ${formatMoney(gelAmt)}${currLabel} recorded`, type: "success" });
        setActiveAction(null);
        setAmount("");
        setNotes("");
        setSplitAmounts({});
        setChipQuantities({});
        const base = currencies.find(c => c.isBase);
        if (base) setSelectedCurrencyId(base.id);
        refreshPlayer();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Transaction failed", type: "error" });
      }
    } catch {
      setToast({ message: "Transaction failed", type: "error" });
    }
    setSubmitting(false);
  }

  async function submitTip() {
    if (!tipTableId || !tipAmount) return;
    setSubmittingTip(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tipTableId,
          amount: parseFloat(tipAmount),
          notes: tipNotes || null,
          chipBreakdown: hasTipChipEntries ? chips.filter(c => (tipChipQuantities[c.id] || 0) > 0).map(c => ({
            chipId: c.id,
            denomination: c.denomination,
            color: c.color,
            quantity: tipChipQuantities[c.id],
            subtotal: c.denomination * tipChipQuantities[c.id],
          })) : null,
        }),
      });
      if (res.ok) {
        setToast({ message: `Tip of ${formatMoney(parseFloat(tipAmount))} collected`, type: "success" });
        setTipAmount("");
        setTipNotes("");
        setTipChipQuantities({});
        // Refresh tips report
        fetch("/api/tips").then(r => r.json()).then(setTipsReport).catch(() => {});
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Tip collection failed", type: "error" });
      }
    } catch {
      setToast({ message: "Tip collection failed", type: "error" });
    }
    setSubmittingTip(false);
  }

  async function submitRake() {
    if (!rakeTableId || !rakeAmount) return;
    setSubmittingRake(true);
    try {
      const res = await fetch("/api/rake-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: rakeTableId,
          amount: parseFloat(rakeAmount),
          notes: rakeNotes || null,
          chipBreakdown: hasRakeChipEntries ? chips.filter(c => (rakeChipQuantities[c.id] || 0) > 0).map(c => ({
            chipId: c.id,
            denomination: c.denomination,
            color: c.color,
            quantity: rakeChipQuantities[c.id],
            subtotal: c.denomination * rakeChipQuantities[c.id],
          })) : null,
        }),
      });
      if (res.ok) {
        setToast({ message: `Rake of ${formatMoney(parseFloat(rakeAmount))} collected`, type: "success" });
        setRakeAmount("");
        setRakeNotes("");
        setRakeChipQuantities({});
        fetch("/api/rake-collections").then(r => r.json()).then(setRakeReport).catch(() => {});
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Rake collection failed", type: "error" });
      }
    } catch {
      setToast({ message: "Rake collection failed", type: "error" });
    }
    setSubmittingRake(false);
  }

  // Rake chip breakdown helpers
  const rakeChipTotal = chips.reduce((sum, c) => sum + c.denomination * (rakeChipQuantities[c.id] || 0), 0);
  const hasRakeChipEntries = Object.values(rakeChipQuantities).some(q => q > 0);

  function setRakeChipQty(chipId: string, qty: number) {
    const newQ = { ...rakeChipQuantities, [chipId]: Math.max(0, qty) };
    setRakeChipQuantities(newQ);
    const total = chips.reduce((sum, c) => sum + c.denomination * (newQ[c.id] || 0), 0);
    if (total > 0) setRakeAmount(total.toString());
    else setRakeAmount("");
  }

  // Tip chip breakdown helpers
  const tipChipTotal = chips.reduce((sum, c) => sum + c.denomination * (tipChipQuantities[c.id] || 0), 0);
  const hasTipChipEntries = Object.values(tipChipQuantities).some(q => q > 0);

  function setTipChipQty(chipId: string, qty: number) {
    const newQ = { ...tipChipQuantities, [chipId]: Math.max(0, qty) };
    setTipChipQuantities(newQ);
    const total = chips.reduce((sum, c) => sum + c.denomination * (newQ[c.id] || 0), 0);
    if (total > 0) setTipAmount(total.toString());
    else setTipAmount("");
  }

  // Expense chip breakdown helpers
  const selectedExpenseType = expenseTypes.find(t => t.id === expenseTypeId);
  const showExpenseChips = selectedExpenseType?.isInternal && chips.length > 0;
  const expenseChipTotal = chips.reduce((sum, c) => sum + c.denomination * (expenseChipQuantities[c.id] || 0), 0);
  const hasExpenseChipEntries = Object.values(expenseChipQuantities).some(q => q > 0);

  function setExpenseChipQty(chipId: string, qty: number) {
    const newQ = { ...expenseChipQuantities, [chipId]: Math.max(0, qty) };
    setExpenseChipQuantities(newQ);
    const total = chips.reduce((sum, c) => sum + c.denomination * (newQ[c.id] || 0), 0);
    if (total > 0) setExpenseAmount(total.toString());
    else setExpenseAmount("");
  }

  async function submitExpense() {
    if (!expenseTypeId || !expenseAmount || parseFloat(expenseAmount) <= 0) return;
    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseTypeId,
          amount: parseFloat(expenseAmount),
          paymentMethod: expensePaymentMethod,
          bankAccountId: expensePaymentMethod === "BANK" ? expenseBankAccountId : null,
          notes: expenseNotes || null,
          chipBreakdown: hasExpenseChipEntries ? chips.filter(c => (expenseChipQuantities[c.id] || 0) > 0).map(c => ({
            chipId: c.id,
            denomination: c.denomination,
            color: c.color,
            quantity: expenseChipQuantities[c.id],
            subtotal: c.denomination * expenseChipQuantities[c.id],
          })) : null,
        }),
      });
      if (res.ok) {
        const typeName = expenseTypes.find(t => t.id === expenseTypeId)?.name || "Expense";
        setToast({ message: `${typeName}: ${formatMoney(parseFloat(expenseAmount))} recorded`, type: "success" });
        setExpenseAmount("");
        setExpenseNotes("");
        setExpensePaymentMethod("CASH");
        setExpenseBankAccountId("");
        setExpenseChipQuantities({});
        fetch("/api/expenses").then(r => r.json()).then(setExpensesReport).catch(() => {});
        fetch("/api/transactions/reports").then(r => r.json()).then(setDayReport).catch(() => {});
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Expense recording failed", type: "error" });
      }
    } catch {
      setToast({ message: "Expense recording failed", type: "error" });
    }
    setSubmittingExpense(false);
  }

  // Calculate balance from transactions
  function calcBalance(txs: TxRecord[]): number {
    return txs.reduce((bal, t) => {
      const gelAmt = t.amountInGel ?? t.amount;
      if (t.type === "BUY_IN" || t.type === "DEPOSIT") return bal + gelAmt;
      return bal - gelAmt;
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
  const channels = dayReport?.channels || [];
  const totalNet = channels.reduce((sum, ch) => sum + ch.balance, 0);

  const channelIcon = (icon: string) => {
    if (icon === "cash") return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M2 10h2M20 10h2M2 14h2M20 14h2" />
      </svg>
    );
    if (icon === "bank") return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  };

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Cashier</h1>
        <p className="mt-1 text-sm text-muted">Transaction management</p>
      </div>

      {/* Today's Channel Summary */}
      {channels.length > 0 && (
        <div className="mb-6" style={{ animation: "floatUp 0.4s ease-out" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {channels.map((ch, i) => (
              <div
                key={i}
                className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-card-border/60">
                  <span style={{ color: ch.icon === "cash" ? "var(--felt-green-light)" : ch.icon === "bank" ? "var(--accent-gold)" : "var(--muted)" }}>
                    {channelIcon(ch.icon)}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--foreground)" }}>
                    {ch.name}
                  </span>
                </div>
                <div className="grid grid-cols-4 divide-x divide-card-border/40">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-0.5">OPENING</p>
                    <p className="text-sm font-bold" style={{ color: "var(--accent-gold-dim)" }}>{formatMoney(ch.opening)}</p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-0.5">IN</p>
                    <p className="text-sm font-bold" style={{ color: "var(--felt-green-light)" }}>{formatMoney(ch.in)}</p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-0.5">OUT</p>
                    <p className="text-sm font-bold" style={{ color: "var(--danger)" }}>{formatMoney(ch.out)}</p>
                  </div>
                  <div className="px-3 py-2.5 text-center" style={{ backgroundColor: ch.balance >= 0 ? "rgba(13, 74, 46, 0.08)" : "rgba(199, 69, 69, 0.05)" }}>
                    <p className="text-[9px] font-semibold tracking-widest uppercase text-muted mb-0.5">BALANCE</p>
                    <p className="text-sm font-bold" style={{ color: ch.balance >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                      {formatMoney(ch.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3" style={{ borderColor: "rgba(201, 168, 76, 0.2)" }}>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Rake Collected</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent-gold-dim)" }}>{formatMoney(rakeReport?.grandTotal ?? summary?.totalRake ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3" style={{ borderColor: "rgba(201, 168, 76, 0.3)" }}>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Tips Collected</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent-gold)" }}>{formatMoney(summary?.totalTipsCollected ?? 0)}</p>
            </div>
            {(() => {
              const totalBalance = totalNet + (tipsReport?.grandTotal ?? 0) + (rakeReport?.grandTotal ?? 0);
              return (
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{
                    borderColor: totalBalance >= 0 ? "rgba(26, 107, 69, 0.4)" : "rgba(199, 69, 69, 0.4)",
                    backgroundColor: totalBalance >= 0 ? "rgba(13, 74, 46, 0.15)" : "rgba(199, 69, 69, 0.08)",
                  }}
                >
                  <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Total Balance</p>
                  <p className="text-lg font-bold" style={{ color: totalBalance >= 0 ? "var(--felt-green-light)" : "var(--danger)" }}>
                    {totalBalance >= 0 ? "+" : "-"}{formatMoney(Math.abs(totalBalance))}
                  </p>
                </div>
              );
            })()}
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
                  {formatMoney(calcBalance(selectedPlayer.transactions))}
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
                    onClick={() => { setActiveAction(isActive ? null : type); setAmount(""); setNotes(""); setSplitAmounts({}); setChipQuantities({}); const base = currencies.find(c => c.isBase); if (base) setSelectedCurrencyId(base.id); }}
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
                {/* Chip Breakdown Table */}
                {showChipBreakdown && (
                  <div className="mb-4 rounded-lg border border-card-border overflow-hidden" style={{ animation: "floatUp 0.2s ease-out" }}>
                    <div className="px-4 py-2 border-b border-card-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted">
                        {activeAction === "BUY_IN" ? "Chips Given" : "Chips Received"}
                      </span>
                      {hasChipEntries && (
                        <button
                          type="button"
                          onClick={() => { setChipQuantities({}); setAmount(""); }}
                          className="text-[10px] font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-card-border/40">
                          <th className="text-left px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Chip</th>
                          <th className="text-right px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Denomination</th>
                          <th className="text-center px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted w-24">Qty</th>
                          <th className="text-right px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chips.map(chip => {
                          const qty = chipQuantities[chip.id] || 0;
                          const subtotal = chip.denomination * qty;
                          return (
                            <tr key={chip.id} className="border-b border-card-border/30 hover:bg-card-border/10 transition-colors">
                              <td className="px-4 py-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                                    style={{
                                      backgroundColor: CHIP_COLOR_HEX[chip.color || ""] || "#6b7c74",
                                      border: "1.5px solid rgba(255,255,255,0.2)",
                                      color: chip.color === "white" || chip.color === "yellow" ? "#1a1a1a" : "#fff",
                                    }}
                                  >
                                    {chip.denomination}
                                  </div>
                                  <span className="text-xs text-muted capitalize">{chip.color || "—"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-1.5 text-right font-medium" style={{ color: "var(--accent-gold-dim)" }}>
                                {formatMoney(chip.denomination)}
                              </td>
                              <td className="px-4 py-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={qty || ""}
                                  onChange={e => setChipQty(chip.id, parseInt(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-20 mx-auto rounded border border-card-border bg-transparent px-2 py-1 text-sm text-center outline-none focus:border-accent-gold/50"
                                  style={{ color: "var(--foreground)" }}
                                />
                              </td>
                              <td className="px-4 py-1.5 text-right font-medium" style={{ color: subtotal > 0 ? "var(--felt-green-light)" : "var(--muted)" }}>
                                {subtotal > 0 ? formatMoney(subtotal) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {hasChipEntries && (
                        <tfoot>
                          <tr className="border-t border-card-border">
                            <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold tracking-wider uppercase text-muted">Total</td>
                            <td className="px-4 py-2 text-center text-xs font-bold" style={{ color: "var(--foreground)" }}>
                              {Object.values(chipQuantities).reduce((s, q) => s + (q || 0), 0)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-bold" style={{ color: "var(--accent-gold)" }}>
                              {formatMoney(chipTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-muted mb-1">Amount</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={amount}
                      onChange={e => { if (!hasChipEntries) setAmount(e.target.value); }}
                      readOnly={hasChipEntries}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                      style={{ color: hasChipEntries ? "var(--accent-gold)" : "var(--foreground)", opacity: hasChipEntries ? 0.8 : 1 }}
                      autoFocus={!showChipBreakdown}
                    />
                  </div>
                  {currencies.length > 1 && (
                    <div className="min-w-[100px]">
                      <label className="block text-xs text-muted mb-1">Currency</label>
                      <select
                        value={selectedCurrencyId}
                        onChange={e => setSelectedCurrencyId(e.target.value)}
                        className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm outline-none cursor-pointer"
                        style={{ color: "var(--foreground)" }}
                      >
                        {currencies.map(c => (
                          <option key={c.id} value={c.id}>{c.code}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 min-w-[120px]">
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
                    disabled={!amount || parseFloat(amount) <= 0 || submitting || (!isDepositWithdrawal && hasSplitEntries && !splitsMatchAmount)}
                    className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
                    style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                  >
                    {submitting ? "..." : "Submit"}
                  </button>
                </div>
                {(() => {
                  const selectedCurr = currencies.find(c => c.id === selectedCurrencyId);
                  if (selectedCurr && !selectedCurr.isBase && amount && parseFloat(amount) > 0) {
                    const gelAmount = parseFloat(amount) * selectedCurr.exchangeRate;
                    return (
                      <p className="mt-2 text-xs" style={{ color: "var(--accent-gold-dim)" }}>
                        = {formatMoney(gelAmount)} <span className="text-muted">(rate: {selectedCurr.exchangeRate})</span>
                      </p>
                    );
                  }
                  return null;
                })()}
                {/* Payment Splits Table */}
                {!isDepositWithdrawal && (
                  <div className="mt-3 rounded-lg border border-card-border overflow-hidden" style={{ animation: "floatUp 0.2s ease-out" }}>
                    <div className="px-4 py-2 border-b border-card-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted">Payment Split</span>
                      {hasSplitEntries && amount && (
                        <span className="text-[10px] font-semibold tracking-wider" style={{ color: splitsMatchAmount ? "var(--felt-green-light)" : "var(--danger)" }}>
                          {splitsMatchAmount ? "Matched" : `Remaining: ${formatMoney(parseFloat(amount) - splitsTotal)}`}
                        </span>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-card-border/30 hover:bg-card-border/10 transition-colors">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
                              <span className="text-xs font-medium" style={{ color: "var(--felt-green-light)" }}>Cash</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right w-36">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={splitAmounts["CASH"] || ""}
                              onChange={e => setSplitAmount("CASH", e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded border border-card-border bg-transparent px-2 py-1 text-sm text-right outline-none focus:border-accent-gold/50"
                              style={{ color: "var(--foreground)" }}
                            />
                          </td>
                        </tr>
                        {bankAccounts.map(ba => (
                          <tr key={ba.id} className="border-b border-card-border/30 hover:bg-card-border/10 transition-colors">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>
                                <span className="text-xs font-medium" style={{ color: "var(--accent-gold)" }}>{ba.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right w-36">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={splitAmounts[ba.id] || ""}
                                onChange={e => setSplitAmount(ba.id, e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded border border-card-border bg-transparent px-2 py-1 text-sm text-right outline-none focus:border-accent-gold/50"
                                style={{ color: "var(--foreground)" }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {hasSplitEntries && (
                        <tfoot>
                          <tr className="border-t border-card-border">
                            <td className="px-4 py-2 text-right text-xs font-semibold tracking-wider uppercase text-muted">Total</td>
                            <td className="px-4 py-2 text-right text-sm font-bold" style={{ color: splitsMatchAmount ? "var(--felt-green-light)" : "var(--accent-gold)" }}>
                              {formatMoney(splitsTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
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
                      {tx.type === "CASH_OUT" || tx.type === "WITHDRAWAL" || tx.type === "RAKEBACK_PAYOUT" ? "-" : "+"}{formatMoney(tx.amountInGel ?? tx.amount)}
                    </span>
                    {tx.currencyCode !== "GEL" && (
                      <span className="block text-[10px] text-muted">{tx.currencyCode} {tx.amount.toFixed(2)}</span>
                    )}
                    <p className="text-[10px] text-muted">
                      {new Date(tx.createdAt).toLocaleString()}
                      {tx.user?.name && <span className="ml-1">· {tx.user.name}</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Collect Rake & Tips Section ── */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: "floatUp 0.4s ease-out" }}>
        {/* Collect Rake */}
        <div className="rounded-xl border border-card-border bg-card-bg/60 p-5">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Collect Rake</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Table</label>
              <select
                value={rakeTableId}
                onChange={e => setRakeTableId(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm outline-none cursor-pointer"
                style={{ color: "var(--foreground)" }}
              >
                <option value="">Select table...</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {chips.length > 0 && (
              <div>
                <label className="block text-xs text-muted mb-1">Chip Breakdown</label>
                <div className="rounded-lg border border-card-border/50 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-card-border/30">
                        <th className="text-left px-3 py-1.5 text-muted">Chip</th>
                        <th className="text-center px-3 py-1.5 text-muted">Qty</th>
                        <th className="text-right px-3 py-1.5 text-muted">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chips.map(c => {
                        const qty = rakeChipQuantities[c.id] || 0;
                        const hex = c.color ? (CHIP_COLOR_HEX[c.color] || "#6b7c74") : "#6b7c74";
                        return (
                          <tr key={c.id} className="border-b border-card-border/20">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[8px] font-bold border" style={{ backgroundColor: hex, borderColor: "rgba(255,255,255,0.2)", color: c.color === "white" || c.color === "yellow" ? "#1a1a1a" : "#fff" }}>{c.denomination}</span>
                                <span style={{ color: "var(--accent-gold)" }}>{formatMoney(c.denomination)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => setRakeChipQty(c.id, qty - 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">-</button>
                                <input type="number" min={0} value={qty || ""} onChange={e => setRakeChipQty(c.id, parseInt(e.target.value) || 0)} className="w-12 text-center rounded border border-card-border bg-transparent text-sm outline-none py-0.5" style={{ color: "var(--foreground)" }} />
                                <button type="button" onClick={() => setRakeChipQty(c.id, qty + 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">+</button>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium" style={{ color: qty > 0 ? "var(--foreground)" : "var(--muted)" }}>{qty > 0 ? formatMoney(c.denomination * qty) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hasRakeChipEntries && (
                    <div className="flex justify-between px-3 py-2 border-t border-card-border/30 font-semibold text-xs">
                      <span className="text-muted">Total:</span>
                      <span style={{ color: "var(--accent-gold)" }}>{formatMoney(rakeChipTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">Amount ({currency.symbol})</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={rakeAmount}
                onChange={e => { if (!hasRakeChipEntries) setRakeAmount(e.target.value); }}
                readOnly={hasRakeChipEntries}
                placeholder="0.00"
                className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                style={{ color: hasRakeChipEntries ? "var(--accent-gold)" : "var(--foreground)", opacity: hasRakeChipEntries ? 0.8 : 1 }}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Notes (optional)</label>
              <input
                type="text"
                value={rakeNotes}
                onChange={e => setRakeNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <button
              onClick={submitRake}
              disabled={!rakeTableId || !rakeAmount || parseFloat(rakeAmount) <= 0 || submittingRake}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
              style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
            >
              {submittingRake ? "..." : "Collect"}
            </button>
          </div>
        </div>

        {/* Collect Tips */}
        <div className="rounded-xl border border-card-border bg-card-bg/60 p-5">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Collect Tips</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Table</label>
              <select
                value={tipTableId}
                onChange={e => setTipTableId(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm outline-none cursor-pointer"
                style={{ color: "var(--foreground)" }}
              >
                <option value="">Select table...</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {chips.length > 0 && (
              <div>
                <label className="block text-xs text-muted mb-1">Chip Breakdown</label>
                <div className="rounded-lg border border-card-border/50 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-card-border/30">
                        <th className="text-left px-3 py-1.5 text-muted">Chip</th>
                        <th className="text-center px-3 py-1.5 text-muted">Qty</th>
                        <th className="text-right px-3 py-1.5 text-muted">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chips.map(c => {
                        const qty = tipChipQuantities[c.id] || 0;
                        const hex = c.color ? (CHIP_COLOR_HEX[c.color] || "#6b7c74") : "#6b7c74";
                        return (
                          <tr key={c.id} className="border-b border-card-border/20">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[8px] font-bold border" style={{ backgroundColor: hex, borderColor: "rgba(255,255,255,0.2)", color: c.color === "white" || c.color === "yellow" ? "#1a1a1a" : "#fff" }}>{c.denomination}</span>
                                <span style={{ color: "var(--accent-gold)" }}>{formatMoney(c.denomination)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => setTipChipQty(c.id, qty - 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">-</button>
                                <input type="number" min={0} value={qty || ""} onChange={e => setTipChipQty(c.id, parseInt(e.target.value) || 0)} className="w-12 text-center rounded border border-card-border bg-transparent text-sm outline-none py-0.5" style={{ color: "var(--foreground)" }} />
                                <button type="button" onClick={() => setTipChipQty(c.id, qty + 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">+</button>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium" style={{ color: qty > 0 ? "var(--foreground)" : "var(--muted)" }}>{qty > 0 ? formatMoney(c.denomination * qty) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hasTipChipEntries && (
                    <div className="flex justify-between px-3 py-2 border-t border-card-border/30 font-semibold text-xs">
                      <span className="text-muted">Total:</span>
                      <span style={{ color: "var(--accent-gold)" }}>{formatMoney(tipChipTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">Amount ({currency.symbol})</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={tipAmount}
                onChange={e => { if (!hasTipChipEntries) setTipAmount(e.target.value); }}
                readOnly={hasTipChipEntries}
                placeholder="0.00"
                className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                style={{ color: hasTipChipEntries ? "var(--accent-gold)" : "var(--foreground)", opacity: hasTipChipEntries ? 0.8 : 1 }}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Notes (optional)</label>
              <input
                type="text"
                value={tipNotes}
                onChange={e => setTipNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <button
              onClick={submitTip}
              disabled={!tipTableId || !tipAmount || parseFloat(tipAmount) <= 0 || submittingTip}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
              style={{ background: "linear-gradient(135deg, var(--accent-gold-dim), var(--accent-gold))", color: "var(--foreground)" }}
            >
              {submittingTip ? "..." : "Collect"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Record Expense Section ── */}
      <div className="mt-6" style={{ animation: "floatUp 0.5s ease-out" }}>
        <div className="rounded-xl border border-card-border bg-card-bg/60 p-5">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Record Expense</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Expense Type</label>
                <select
                  value={expenseTypeId}
                  onChange={e => setExpenseTypeId(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm outline-none cursor-pointer"
                  style={{ color: "var(--foreground)" }}
                >
                  <option value="">Select type...</option>
                  {expenseTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.isInternal ? " (internal)" : ""}</option>
                  ))}
                </select>
              </div>
              {/* Chip breakdown for internal expenses */}
              {showExpenseChips && (
                <div>
                  <label className="block text-xs text-muted mb-1">Chip Breakdown</label>
                  <div className="rounded-lg border border-card-border/50 overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-card-border/30">
                          <th className="text-left px-3 py-1.5 text-muted">Chip</th>
                          <th className="text-center px-3 py-1.5 text-muted">Qty</th>
                          <th className="text-right px-3 py-1.5 text-muted">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chips.map(c => {
                          const qty = expenseChipQuantities[c.id] || 0;
                          const hex = c.color ? (CHIP_COLOR_HEX[c.color] || "#6b7c74") : "#6b7c74";
                          return (
                            <tr key={c.id} className="border-b border-card-border/20">
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[8px] font-bold border" style={{ backgroundColor: hex, borderColor: "rgba(255,255,255,0.2)", color: c.color === "white" || c.color === "yellow" ? "#1a1a1a" : "#fff" }}>{c.denomination}</span>
                                  <span style={{ color: "var(--accent-gold)" }}>{formatMoney(c.denomination)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button type="button" onClick={() => setExpenseChipQty(c.id, qty - 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">-</button>
                                  <input type="number" min={0} value={qty || ""} onChange={e => setExpenseChipQty(c.id, parseInt(e.target.value) || 0)} className="w-12 text-center rounded border border-card-border bg-transparent text-sm outline-none py-0.5" style={{ color: "var(--foreground)" }} />
                                  <button type="button" onClick={() => setExpenseChipQty(c.id, qty + 1)} className="w-6 h-6 rounded border border-card-border text-muted hover:text-foreground cursor-pointer text-sm">+</button>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium" style={{ color: qty > 0 ? "var(--foreground)" : "var(--muted)" }}>{qty > 0 ? formatMoney(c.denomination * qty) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hasExpenseChipEntries && (
                      <div className="flex justify-between px-3 py-2 border-t border-card-border/30 font-semibold text-xs">
                        <span className="text-muted">Total:</span>
                        <span style={{ color: "var(--accent-gold)" }}>{formatMoney(expenseChipTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-muted mb-1">Amount ({currency.symbol})</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  readOnly={!!showExpenseChips}
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)", opacity: showExpenseChips ? 0.7 : 1 }}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Payment Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setExpensePaymentMethod("CASH"); setExpenseBankAccountId(""); }}
                    className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all"
                    style={{
                      borderColor: expensePaymentMethod === "CASH" ? "var(--felt-green-light)" : "var(--card-border)",
                      backgroundColor: expensePaymentMethod === "CASH" ? "rgba(13, 74, 46, 0.2)" : "transparent",
                      color: expensePaymentMethod === "CASH" ? "var(--felt-green-light)" : "var(--muted)",
                    }}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod("BANK")}
                    className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all"
                    style={{
                      borderColor: expensePaymentMethod === "BANK" ? "var(--accent-gold)" : "var(--card-border)",
                      backgroundColor: expensePaymentMethod === "BANK" ? "rgba(201, 168, 76, 0.1)" : "transparent",
                      color: expensePaymentMethod === "BANK" ? "var(--accent-gold)" : "var(--muted)",
                    }}
                  >
                    Bank
                  </button>
                </div>
              </div>
              {expensePaymentMethod === "BANK" && (
                <div>
                  <label className="block text-xs text-muted mb-1">Bank Account</label>
                  <select
                    value={expenseBankAccountId}
                    onChange={e => setExpenseBankAccountId(e.target.value)}
                    className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2.5 text-sm outline-none cursor-pointer"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="">Select bank...</option>
                    {bankAccounts.map(ba => (
                      <option key={ba.id} value={ba.id}>{ba.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-muted mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={e => setExpenseNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <button
                onClick={submitExpense}
                disabled={!expenseTypeId || !expenseAmount || parseFloat(expenseAmount) <= 0 || (expensePaymentMethod === "BANK" && !expenseBankAccountId) || submittingExpense}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
                style={{ backgroundColor: "rgba(199, 69, 69, 0.2)", color: "var(--danger)", border: "1px solid rgba(199, 69, 69, 0.3)" }}
              >
                {submittingExpense ? "..." : "Record Expense"}
              </button>
            </div>

            {/* Today's Expenses List */}
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-muted mb-2">
                Today{`'`}s Expenses {expensesReport && expensesReport.total > 0 && (
                  <span style={{ color: "var(--danger)" }}> — {formatMoney(expensesReport.total)}</span>
                )}
              </div>
              <div className="rounded-lg border border-card-border/50 overflow-hidden max-h-64 overflow-y-auto">
                {!expensesReport || expensesReport.expenses.length === 0 ? (
                  <div className="px-4 py-6 text-center text-muted text-xs">No expenses today</div>
                ) : (
                  expensesReport.expenses.map(exp => (
                    <div key={exp.id} className="flex items-center px-4 py-2.5 border-b border-card-border/30 last:border-0 hover:bg-card-border/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: "var(--danger)" }}>{exp.expenseType.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted">{exp.paymentMethod === "BANK" && exp.bankAccount ? exp.bankAccount.name : "Cash"}</span>
                          {exp.notes && <span className="text-[10px] text-muted truncate">— {exp.notes}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>-{formatMoney(exp.amount)}</span>
                        <p className="text-[10px] text-muted">{new Date(exp.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chip Inventory ── */}
      {chipInventory.length > 0 && (
        <div className="mt-6" style={{ animation: "floatUp 0.5s ease-out" }}>
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-card-border">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">Chip Inventory</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border/40">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold tracking-wider uppercase text-muted">Chip</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold tracking-wider uppercase text-muted">Total</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold tracking-wider uppercase text-muted">Cashier</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold tracking-wider uppercase text-muted">Field</th>
                </tr>
              </thead>
              <tbody>
                {chipInventory.map(ci => {
                  const hex = ci.color ? (CHIP_COLOR_HEX[ci.color] || "#6b7c74") : "#6b7c74";
                  return (
                    <tr key={ci.chipId} className="border-b border-card-border/30 hover:bg-card-border/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[8px] font-bold border"
                            style={{
                              backgroundColor: hex,
                              borderColor: "rgba(255,255,255,0.2)",
                              color: ci.color === "white" || ci.color === "yellow" ? "#1a1a1a" : "#fff",
                            }}
                          >
                            {ci.denomination}
                          </span>
                          <span className="text-xs capitalize text-muted">{ci.color || "—"}</span>
                          <span className="text-xs font-medium" style={{ color: "var(--accent-gold-dim)" }}>{formatMoney(ci.denomination)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{ci.total}</td>
                      <td className="px-4 py-2 text-right font-medium" style={{ color: "var(--felt-green-light)" }}>{ci.cashier}</td>
                      <td className="px-4 py-2 text-right font-medium" style={{ color: ci.field > 0 ? "var(--accent-gold)" : ci.field < 0 ? "var(--danger)" : "var(--muted)" }}>{ci.field}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-card-border">
                  <td className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-muted">Total Value</td>
                  <td className="px-4 py-2 text-right text-sm font-bold">{formatMoney(chipInventory.reduce((s, c) => s + c.total * c.denomination, 0))}</td>
                  <td className="px-4 py-2 text-right text-sm font-bold" style={{ color: "var(--felt-green-light)" }}>{formatMoney(chipInventory.reduce((s, c) => s + c.cashier * c.denomination, 0))}</td>
                  <td className="px-4 py-2 text-right text-sm font-bold" style={{ color: "var(--accent-gold)" }}>{formatMoney(chipInventory.reduce((s, c) => s + c.field * c.denomination, 0))}</td>
                </tr>
              </tfoot>
            </table>
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
