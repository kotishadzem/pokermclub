"use client";

import { useEffect, useState, useCallback } from "react";

interface GameType {
  id: string;
  name: string;
  description: string | null;
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

export default function GameTypesPage() {
  const [items, setItems] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GameType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GameType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/game-types");
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(item: GameType) {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "" });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editItem ? `/api/game-types/${editItem.id}` : "/api/game-types";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error || "Failed", type: "error" });
        return;
      }
      setToast({ message: editItem ? "Game type updated" : "Game type created", type: "success" });
      setModalOpen(false);
      fetchItems();
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await fetch(`/api/game-types/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setToast({ message: "Game type deleted", type: "success" });
    fetchItems();
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Game Types</h1>
          <p className="mt-1 text-sm text-muted">Configure available poker game types</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer"
          style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
        >
          + Add Game Type
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Description</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-muted">No game types</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <span className="text-accent-gold mr-2">♠</span>
                    {item.name}
                  </td>
                  <td className="px-5 py-3 text-muted">{item.description || "—"}</td>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                {editItem ? "Edit Game Type" : "Add Game Type"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                  {editItem ? "Update" : "Create"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-card-border bg-card-bg p-6 shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--danger)" }}>Delete Game Type</h3>
            <p className="text-sm text-muted mb-5">Delete <strong className="text-foreground">{confirmDelete.name}</strong>? This cannot be undone.</p>
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
