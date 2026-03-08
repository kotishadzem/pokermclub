"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/lib/currency";

interface Chip {
  id: string;
  denomination: number;
  quantity: number;
  color: string | null;
  active: boolean;
  createdAt: string;
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

const CHIP_COLORS = [
  { value: "white", label: "White", hex: "#e8e8e8" },
  { value: "red", label: "Red", hex: "#c74545" },
  { value: "blue", label: "Blue", hex: "#3b6fc4" },
  { value: "green", label: "Green", hex: "#1a6b45" },
  { value: "black", label: "Black", hex: "#2a2a2a" },
  { value: "purple", label: "Purple", hex: "#7b4bb3" },
  { value: "yellow", label: "Yellow", hex: "#c9a84c" },
  { value: "orange", label: "Orange", hex: "#d4802a" },
  { value: "pink", label: "Pink", hex: "#d45c8c" },
];

function chipColorHex(color: string | null): string {
  const found = CHIP_COLORS.find(c => c.value === color);
  return found ? found.hex : "#6b7c74";
}

export default function ChipsPage() {
  const { formatMoney } = useCurrency();
  const [items, setItems] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Chip | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Chip | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ denomination: "", quantity: "", color: "" });

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/chips");
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditItem(null);
    setForm({ denomination: "", quantity: "", color: "" });
    setModalOpen(true);
  }

  function openEdit(item: Chip) {
    setEditItem(item);
    setForm({
      denomination: item.denomination.toString(),
      quantity: item.quantity.toString(),
      color: item.color || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editItem ? `/api/chips/${editItem.id}` : "/api/chips";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          denomination: parseFloat(form.denomination),
          quantity: parseInt(form.quantity),
          color: form.color || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed", type: "error" });
        return;
      }
      setToast({ message: editItem ? "Chip updated" : "Chip added", type: "success" });
      setModalOpen(false);
      fetchItems();
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await fetch(`/api/chips/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || "Failed", type: "error" });
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    setToast({ message: "Chip removed", type: "success" });
    fetchItems();
  }

  const totalValue = items.reduce((sum, c) => sum + c.denomination * c.quantity, 0);
  const totalCount = items.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Chips</h1>
          <p className="mt-1 text-sm text-muted">Manage chip denominations and quantities</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer"
          style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
        >
          + Add Chip
        </button>
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Total Chips</p>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{totalCount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-card-border bg-card-bg/60 px-5 py-4">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Total Value</p>
            <p className="text-2xl font-bold" style={{ color: "var(--accent-gold)" }}>{formatMoney(totalValue)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Color</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Denomination</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Quantity</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Total Value</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No chips added yet</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-md"
                        style={{
                          backgroundColor: chipColorHex(item.color),
                          borderColor: "rgba(255,255,255,0.25)",
                          color: item.color === "white" || item.color === "yellow" ? "#1a1a1a" : "#fff",
                          boxShadow: `0 2px 8px ${chipColorHex(item.color)}40`,
                        }}
                      >
                        {item.denomination}
                      </div>
                      <span className="text-xs text-muted capitalize">{item.color || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--accent-gold)" }}>
                    {formatMoney(item.denomination)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-medium" style={{ color: "var(--felt-green-light)" }}>
                    {formatMoney(item.denomination * item.quantity)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-accent-gold hover:text-accent-gold/80 mr-3 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(item)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-danger/70 hover:text-danger transition-colors">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                {editItem ? "Edit Chip" : "Add Chip"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Denomination</label>
                  <input
                    type="number"
                    value={form.denomination}
                    onChange={(e) => setForm({ ...form, denomination: e.target.value })}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="100"
                    className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                    min="0"
                    step="1"
                    placeholder="500"
                    className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {CHIP_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: form.color === c.value ? "" : c.value })}
                      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
                      style={{
                        borderColor: form.color === c.value ? c.hex : "var(--card-border)",
                        backgroundColor: form.color === c.value ? `${c.hex}20` : "transparent",
                        color: form.color === c.value ? c.hex : "var(--muted)",
                      }}
                    >
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.hex }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Preview */}
              {form.denomination && (
                <div className="flex items-center justify-center py-3">
                  <div
                    className="w-14 h-14 rounded-full border-3 flex items-center justify-center text-sm font-bold shadow-lg"
                    style={{
                      backgroundColor: chipColorHex(form.color || null),
                      borderColor: "rgba(255,255,255,0.3)",
                      color: form.color === "white" || form.color === "yellow" ? "#1a1a1a" : "#fff",
                      boxShadow: `0 4px 16px ${chipColorHex(form.color || null)}50`,
                      borderWidth: "3px",
                    }}
                  >
                    {parseFloat(form.denomination) || 0}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                  {editItem ? "Update" : "Add"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="w-full max-w-sm rounded-xl border border-card-border bg-card-bg p-6 shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--danger)" }}>Delete Chip</h3>
            <p className="text-sm text-muted mb-5">This will remove the <strong className="text-foreground">{formatMoney(confirmDelete.denomination)}</strong> chip ({confirmDelete.quantity} pcs).</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer" style={{ backgroundColor: "rgba(199, 69, 69, 0.2)", color: "var(--danger)", border: "1px solid rgba(199, 69, 69, 0.3)" }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
