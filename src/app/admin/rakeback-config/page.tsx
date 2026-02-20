"use client";

import { useEffect, useState } from "react";

interface RakebackEntry {
  player: { id: string; firstName: string; lastName: string; rakebackPercent: number };
  totalRakeContributed: number;
  rakebackEarned: number;
  totalPaidOut: number;
  rakebackBalance: number;
}

interface PlayerOption {
  id: string;
  firstName: string;
  lastName: string;
  rakebackPercent: number;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: type === "success" ? "rgba(26, 107, 69, 0.5)" : "rgba(199, 69, 69, 0.5)", backgroundColor: type === "success" ? "rgba(13, 74, 46, 0.9)" : "rgba(120, 30, 30, 0.9)", color: "var(--foreground)" }}>
      {message}
    </div>
  );
}

export default function RakebackConfigPage() {
  const [entries, setEntries] = useState<RakebackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerResults, setPlayerResults] = useState<PlayerOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState("");

  useEffect(() => {
    fetchRakeback();
  }, []);

  async function fetchRakeback() {
    setLoading(true);
    const res = await fetch("/api/rakeback");
    setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (playerSearch.length < 2) { setPlayerResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${playerSearch}`);
      setPlayerResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  async function setRakebackPercent(playerId: string, percent: number) {
    const res = await fetch(`/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rakebackPercent: percent }),
    });
    if (res.ok) {
      setToast({ message: `Rakeback set to ${percent}%`, type: "success" });
      setEditingId(null);
      setEditPercent("");
      fetchRakeback();
    } else {
      setToast({ message: "Failed to update", type: "error" });
    }
  }

  async function addPlayerRakeback(player: PlayerOption) {
    setPlayerSearch("");
    setPlayerResults([]);
    // Set default 10% if player has 0
    if (player.rakebackPercent === 0) {
      await setRakebackPercent(player.id, 10);
    } else {
      setToast({ message: `${player.firstName} already has ${player.rakebackPercent}% rakeback`, type: "error" });
    }
  }

  const totalBalance = entries.reduce((sum, e) => sum + e.rakebackBalance, 0);
  const totalEarned = entries.reduce((sum, e) => sum + e.rakebackEarned, 0);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Rakeback Configuration</h1>
        <p className="mt-1 text-sm text-muted">Manage player rakeback percentages and balances</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Players with Rakeback</p>
          <p className="text-lg font-bold" style={{ color: "var(--accent-gold)" }}>{entries.length}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Total Earned</p>
          <p className="text-lg font-bold" style={{ color: "var(--felt-green-light)" }}>${totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-1">Outstanding Balance</p>
          <p className="text-lg font-bold" style={{ color: "var(--accent-gold-dim)" }}>${totalBalance.toFixed(2)}</p>
        </div>
      </div>

      {/* Add player */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-5 mb-6">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Add Player to Rakeback Program</h3>
        <div className="relative max-w-md">
          <input
            type="text"
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Search player..."
            className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
            style={{ color: "var(--foreground)" }}
          />
          {playerResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-card-border bg-card-bg shadow-xl max-h-40 overflow-y-auto">
              {playerResults.map(p => (
                <button key={p.id} onClick={() => addPlayerRakeback(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-felt-green/20 transition-colors cursor-pointer border-b border-card-border/50 last:border-0">
                  {p.firstName} {p.lastName}
                  {p.rakebackPercent > 0 && <span className="ml-2 text-xs text-accent-gold-dim">({p.rakebackPercent}%)</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rakeback table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Player</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Rakeback %</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Rake Contributed</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Earned</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Paid Out</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Balance</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No players with rakeback</td></tr>
            ) : (
              entries.map(e => (
                <tr key={e.player.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 font-medium">{e.player.firstName} {e.player.lastName}</td>
                  <td className="px-5 py-3 text-right">
                    {editingId === e.player.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={editPercent}
                          onChange={ev => setEditPercent(ev.target.value)}
                          className="w-16 rounded border border-card-border bg-transparent px-2 py-1 text-xs text-right outline-none"
                          style={{ color: "var(--foreground)" }}
                          autoFocus
                        />
                        <button
                          onClick={() => setRakebackPercent(e.player.id, parseFloat(editPercent) || 0)}
                          className="text-[10px] text-felt-green-light hover:text-foreground cursor-pointer"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditPercent(""); }}
                          className="text-[10px] text-muted hover:text-foreground cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-accent-gold">{e.player.rakebackPercent}%</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-muted">${e.totalRakeContributed.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right" style={{ color: "var(--felt-green-light)" }}>${e.rakebackEarned.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-muted">${e.totalPaidOut.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: e.rakebackBalance > 0 ? "var(--accent-gold)" : "var(--muted)" }}>
                    ${e.rakebackBalance.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => { setEditingId(e.player.id); setEditPercent(String(e.player.rakebackPercent)); }}
                      className="cursor-pointer text-xs font-medium tracking-wider uppercase text-accent-gold hover:text-accent-gold/80 mr-3 transition-colors"
                    >
                      Edit %
                    </button>
                    <button
                      onClick={() => setRakebackPercent(e.player.id, 0)}
                      className="cursor-pointer text-xs font-medium tracking-wider uppercase text-danger/70 hover:text-danger transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
