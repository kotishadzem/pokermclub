"use client";

import { useEffect, useState, useCallback } from "react";

interface GameType { id: string; name: string; }
interface TableData {
  id: string;
  name: string;
  gameType: GameType | null;
  gameTypeId: string | null;
  seats: number;
  minBuyIn: number;
  maxBuyIn: number;
  blindSmall: number;
  blindBig: number;
  status: string;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: type === "success" ? "rgba(26, 107, 69, 0.5)" : "rgba(199, 69, 69, 0.5)", backgroundColor: type === "success" ? "rgba(13, 74, 46, 0.9)" : "rgba(120, 30, 30, 0.9)", color: "var(--foreground)" }}>
      {message}
    </div>
  );
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TableData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TableData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    name: "", gameTypeId: "", seats: 9, minBuyIn: 0, maxBuyIn: 0, blindSmall: 0, blindBig: 0,
  });

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    setTables(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();
    fetch("/api/game-types").then(r => r.json()).then(setGameTypes);
  }, [fetchTables]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: "", gameTypeId: "", seats: 9, minBuyIn: 0, maxBuyIn: 0, blindSmall: 0, blindBig: 0 });
    setModalOpen(true);
  }

  function openEdit(t: TableData) {
    setEditItem(t);
    setForm({ name: t.name, gameTypeId: t.gameTypeId || "", seats: t.seats, minBuyIn: t.minBuyIn, maxBuyIn: t.maxBuyIn, blindSmall: t.blindSmall, blindBig: t.blindBig });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editItem ? `/api/tables/${editItem.id}` : "/api/tables";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { setToast({ message: "Failed", type: "error" }); return; }
    setToast({ message: editItem ? "Table updated" : "Table created", type: "success" });
    setModalOpen(false);
    fetchTables();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await fetch(`/api/tables/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setToast({ message: "Table deleted", type: "success" });
    fetchTables();
  }

  async function toggleTable(t: TableData) {
    if (t.status === "OPEN") {
      await fetch(`/api/tables/${t.id}/session`, { method: "DELETE" });
    } else {
      await fetch(`/api/tables/${t.id}/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    }
    fetchTables();
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Tables</h1>
          <p className="mt-1 text-sm text-muted">Manage poker tables</p>
        </div>
        <button onClick={openCreate} className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
          + Add Table
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Game</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Seats</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Blinds</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Buy-in</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : tables.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No tables</td></tr>
            ) : (
              tables.map(t => (
                <tr key={t.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-muted">{t.gameType?.name || "—"}</td>
                  <td className="px-5 py-3 text-muted">{t.seats}</td>
                  <td className="px-5 py-3 text-accent-gold-dim">{t.blindSmall}/{t.blindBig}</td>
                  <td className="px-5 py-3 text-muted">${t.minBuyIn}–${t.maxBuyIn}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleTable(t)} className="cursor-pointer text-xs font-medium tracking-wider uppercase" style={{ color: t.status === "OPEN" ? "var(--felt-green-light)" : "var(--muted)" }}>
                      {t.status === "OPEN" ? "● Open" : "○ Closed"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(t)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-accent-gold hover:text-accent-gold/80 mr-3 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(t)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-danger/70 hover:text-danger transition-colors">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="w-full max-w-lg rounded-xl border border-card-border bg-card-bg shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                {editItem ? "Edit Table" : "Add Table"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Table Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Game Type</label>
                  <select value={form.gameTypeId} onChange={e => setForm({ ...form, gameTypeId: e.target.value })} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer" style={{ color: "var(--foreground)" }}>
                    <option value="">None</option>
                    {gameTypes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Seats</label>
                  <input type="number" min={2} max={12} value={form.seats} onChange={e => setForm({ ...form, seats: parseInt(e.target.value) || 9 })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none" style={{ color: "var(--foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Small Blind</label>
                  <input type="number" min={0} step="0.5" value={form.blindSmall} onChange={e => setForm({ ...form, blindSmall: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none" style={{ color: "var(--foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Big Blind</label>
                  <input type="number" min={0} step="0.5" value={form.blindBig} onChange={e => setForm({ ...form, blindBig: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none" style={{ color: "var(--foreground)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Min Buy-in</label>
                  <input type="number" min={0} value={form.minBuyIn} onChange={e => setForm({ ...form, minBuyIn: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none" style={{ color: "var(--foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Max Buy-in</label>
                  <input type="number" min={0} value={form.maxBuyIn} onChange={e => setForm({ ...form, maxBuyIn: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none" style={{ color: "var(--foreground)" }} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>{editItem ? "Update" : "Create"}</button>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="w-full max-w-sm rounded-xl border border-card-border bg-card-bg p-6 shadow-2xl" style={{ animation: "floatUp 0.2s ease-out" }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--danger)" }}>Delete Table</h3>
            <p className="text-sm text-muted mb-5">Delete <strong className="text-foreground">{confirmDelete.name}</strong>?</p>
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
