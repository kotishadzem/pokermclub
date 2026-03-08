"use client";

import { useEffect, useState, useCallback } from "react";

interface ExpenseType {
  id: string;
  name: string;
  isInternal: boolean;
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

export default function ExpenseTypesPage() {
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [name, setName] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/expense-types");
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditItem(null);
    setName("");
    setIsInternal(false);
    setModalOpen(true);
  }

  function openEdit(item: ExpenseType) {
    setEditItem(item);
    setName(item.name);
    setIsInternal(item.isInternal);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editItem ? `/api/expense-types/${editItem.id}` : "/api/expense-types";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isInternal }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed", type: "error" });
        return;
      }
      setToast({ message: editItem ? "Expense type updated" : "Expense type added", type: "success" });
      setModalOpen(false);
      fetchItems();
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await fetch(`/api/expense-types/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setToast({ message: err.error || "Failed", type: "error" });
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    setToast({ message: "Expense type removed", type: "success" });
    fetchItems();
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Expense Types</h1>
          <p className="mt-1 text-sm text-muted">Manage expense categories for cash outflows</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer"
          style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
        >
          + Add Type
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Name</th>
              <th className="text-center px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Internal</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Created</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No expense types added yet</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base" style={{ color: "var(--danger)" }}>◇</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {item.isInternal && (
                      <span className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--accent-gold)", backgroundColor: "rgba(201, 168, 76, 0.15)" }}>
                        Internal
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-muted">
                    {new Date(item.createdAt).toLocaleDateString()}
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
                {editItem ? "Edit Expense Type" : "Add Expense Type"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Office Supplies, Food, Transport..."
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-card-border cursor-pointer accent-[var(--accent-gold)]"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Internal expense</span>
                  <p className="text-[10px] text-muted">Amount calculated from chip breakdown</p>
                </div>
              </label>
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
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--danger)" }}>Delete Expense Type</h3>
            <p className="text-sm text-muted mb-5">This will remove <strong className="text-foreground">{confirmDelete.name}</strong> from the list.</p>
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
