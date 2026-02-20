"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiveData } from "@/lib/use-live-data";

interface WLEntry {
  id: string;
  position: number;
  player: { id: string; firstName: string; lastName: string };
  table: { id: string; name: string } | null;
}
interface TableOption { id: string; name: string; }
interface PlayerOption { id: string; firstName: string; lastName: string; }

export default function WaitingListPage() {
  const [entries, setEntries] = useState<WLEntry[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerResults, setPlayerResults] = useState<PlayerOption[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [toast, setToast] = useState("");

  const fetchAll = useCallback(async () => {
    const [entriesRes, tablesRes] = await Promise.all([
      fetch("/api/waiting-list"),
      fetch("/api/tables"),
    ]);
    setEntries(await entriesRes.json());
    setTables(await tablesRes.json());
    setLoading(false);
  }, []);

  useLiveData(fetchAll, 5000);

  useEffect(() => {
    if (playerSearch.length < 2) { setPlayerResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${playerSearch}`);
      setPlayerResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  function selectPlayer(p: PlayerOption) {
    setSelectedPlayerId(p.id);
    setSelectedPlayerName(`${p.firstName} ${p.lastName}`);
    setPlayerSearch("");
    setPlayerResults([]);
  }

  async function addToList() {
    if (!selectedPlayerId) return;
    await fetch("/api/waiting-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selectedPlayerId, tableId: selectedTableId || null }),
    });
    setSelectedPlayerId("");
    setSelectedPlayerName("");
    setToast("Added to waiting list");
    setTimeout(() => setToast(""), 3000);
    fetchAll();
  }

  async function removeEntry(id: string) {
    await fetch(`/api/waiting-list/${id}`, { method: "DELETE" });
    fetchAll();
  }

  // Group by table
  const grouped: Record<string, WLEntry[]> = {};
  entries.forEach(e => {
    const key = e.table ? e.table.name : "General";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: "rgba(26, 107, 69, 0.5)", backgroundColor: "rgba(13, 74, 46, 0.9)", color: "var(--foreground)" }}>
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Waiting List</h1>
        <p className="mt-1 text-sm text-muted">{entries.length} players waiting</p>
      </div>

      {/* Add to waiting list */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-5 mb-6">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Add Player to Waiting List</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs text-muted mb-1">Player</label>
            {selectedPlayerId ? (
              <div className="flex items-center gap-2 rounded-lg border border-card-border px-4 py-2.5 text-sm" style={{ color: "var(--foreground)" }}>
                <span className="flex-1">{selectedPlayerName}</span>
                <button onClick={() => { setSelectedPlayerId(""); setSelectedPlayerName(""); }} className="text-muted hover:text-foreground cursor-pointer">✕</button>
              </div>
            ) : (
              <>
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
                      <button key={p.id} onClick={() => selectPlayer(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-felt-green/20 transition-colors cursor-pointer border-b border-card-border/50 last:border-0">
                        {p.firstName} {p.lastName}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="w-48">
            <label className="block text-xs text-muted mb-1">Table</label>
            <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none cursor-pointer" style={{ color: "var(--foreground)" }}>
              <option value="">General</option>
              {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button
            onClick={addToList}
            disabled={!selectedPlayerId}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Waiting list grouped */}
      {loading ? (
        <div className="text-center text-muted py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card-bg/40 p-8 text-center text-muted text-sm">No one waiting</div>
      ) : (
        Object.entries(grouped).map(([tableName, group]) => (
          <div key={tableName} className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-card-border flex items-center gap-2">
              <span className="text-accent-gold text-sm">▣</span>
              <h3 className="text-sm font-semibold tracking-wider uppercase">{tableName}</h3>
              <span className="text-xs text-muted ml-auto">{group.length} waiting</span>
            </div>
            {group.map(entry => (
              <div key={entry.id} className="flex items-center px-5 py-3 border-b border-card-border/50 last:border-0 hover:bg-card-border/20 transition-colors">
                <span className="text-accent-gold-dim w-8 text-sm font-medium">#{entry.position}</span>
                <span className="flex-1 text-sm font-medium">{entry.player.firstName} {entry.player.lastName}</span>
                <button onClick={() => removeEntry(entry.id)} className="text-xs font-medium tracking-wider uppercase text-danger/60 hover:text-danger cursor-pointer transition-colors">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
