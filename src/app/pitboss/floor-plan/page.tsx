"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useLiveData } from "@/lib/use-live-data";

interface Seat {
  id: string;
  seatNumber: number;
  player: { id: string; firstName: string; lastName: string };
}
interface Session {
  id: string;
  dealer: { id: string; name: string } | null;
  seats: Seat[];
}
interface WLEntry {
  id: string;
  position: number;
  player: { id: string; firstName: string; lastName: string };
}
interface TableData {
  id: string;
  name: string;
  gameType: { name: string } | null;
  seats: number;
  blindSmall: number;
  blindBig: number;
  status: string;
  posX: number;
  posY: number;
  sessions: Session[];
  waitingList: WLEntry[];
}
interface PlayerOption { id: string; firstName: string; lastName: string; }
interface DealerOption { id: string; name: string; }

export default function FloorPlanPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [selected, setSelected] = useState<TableData | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerResults, setPlayerResults] = useState<PlayerOption[]>([]);
  const [seatNumber, setSeatNumber] = useState(1);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    const data = await res.json();
    setTables(data);
    if (selected) {
      const updated = data.find((t: TableData) => t.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useLiveData(fetchTables, 3000);

  useEffect(() => {
    fetch("/api/dealers").then(r => r.json()).then(setDealers).catch(() => {});
  }, []);

  useEffect(() => {
    if (playerSearch.length < 2) { setPlayerResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${playerSearch}`);
      setPlayerResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  function handleMouseDown(e: React.MouseEvent, table: TableData) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { id: table.id, startX: e.clientX, startY: e.clientY, origX: table.posX, origY: table.posY };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTables(prev => prev.map(t =>
        t.id === dragRef.current!.id ? { ...t, posX: dragRef.current!.origX + dx, posY: dragRef.current!.origY + dy } : t
      ));
    }
    function handleMouseUp() {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const table = tables.find(t => t.id === d.id);
      if (table) {
        fetch(`/api/tables/${d.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posX: table.posX, posY: table.posY }),
        });
      }
      dragRef.current = null;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [tables]);

  async function openTable(id: string) {
    await fetch(`/api/tables/${id}/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealerId: selectedDealerId || null }) });
    setSelectedDealerId("");
    fetchTables();
  }

  async function closeTable(id: string) {
    await fetch(`/api/tables/${id}/session`, { method: "DELETE" });
    fetchTables();
  }

  async function seatPlayer(tableId: string, playerId: string) {
    await fetch(`/api/tables/${tableId}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, seatNumber, buyInAmount: 0 }),
    });
    setPlayerSearch("");
    setPlayerResults([]);
    fetchTables();
  }

  async function unseatPlayer(tableId: string, seatId: string) {
    await fetch(`/api/tables/${tableId}/seats`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatId }),
    });
    fetchTables();
  }

  const activeSession = selected?.sessions?.[0] || null;
  const seatedPlayers = activeSession?.seats || [];

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Floor Plan</h1>
          <p className="mt-1 text-sm text-muted">{tables.filter(t => t.status === "OPEN").length} open tables</p>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
        {/* Floor area */}
        <div
          ref={floorRef}
          className="flex-1 relative rounded-xl border border-card-border overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, rgba(13, 74, 46, 0.15) 0%, rgba(8, 11, 10, 0.95) 100%)",
            minHeight: "600px",
          }}
        >
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "radial-gradient(circle, var(--felt-green-light) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }} />

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
              No tables yet. Create tables from the Tables page.
            </div>
          )}

          {tables.map(table => {
            const isOpen = table.status === "OPEN";
            const session = table.sessions?.[0];
            const seated = session?.seats?.length || 0;
            const isSelected = selected?.id === table.id;

            return (
              <div
                key={table.id}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={() => setSelected(table)}
                className="absolute cursor-grab active:cursor-grabbing select-none"
                style={{ left: table.posX, top: table.posY }}
              >
                <div
                  className={`
                    relative w-36 h-24 rounded-[50%] border-2 flex flex-col items-center justify-center
                    transition-shadow duration-200
                    ${isSelected ? "ring-2 ring-accent-gold/50" : ""}
                  `}
                  style={{
                    borderColor: isOpen ? "var(--felt-green-light)" : "var(--card-border)",
                    background: isOpen
                      ? "radial-gradient(ellipse, rgba(13, 74, 46, 0.5) 0%, rgba(13, 74, 46, 0.2) 100%)"
                      : "radial-gradient(ellipse, rgba(30, 46, 39, 0.4) 0%, rgba(17, 25, 22, 0.6) 100%)",
                    boxShadow: isOpen
                      ? "0 0 20px rgba(26, 107, 69, 0.15), inset 0 0 15px rgba(13, 74, 46, 0.1)"
                      : "none",
                  }}
                >
                  <span className="text-xs font-bold tracking-wide" style={{ color: isOpen ? "var(--foreground)" : "var(--muted)" }}>
                    {table.name}
                  </span>
                  {table.gameType && (
                    <span className="text-[9px] text-muted mt-0.5 tracking-wider uppercase">{table.gameType.name}</span>
                  )}
                  <span className="text-[9px] text-accent-gold-dim mt-0.5">
                    {table.blindSmall}/{table.blindBig} • {seated}/{table.seats}
                  </span>

                  {/* Status indicator */}
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: isOpen ? "var(--felt-green-light)" : "var(--muted)",
                      borderColor: "var(--background)",
                      boxShadow: isOpen ? "0 0 6px rgba(26, 107, 69, 0.6)" : "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 rounded-xl border border-card-border bg-card-bg/80 flex flex-col overflow-hidden" style={{ animation: "floatUp 0.2s ease-out" }}>
            <div className="px-5 py-4 border-b border-card-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground cursor-pointer text-sm">✕</button>
              </div>
              <p className="text-xs text-muted mt-1">
                {selected.gameType?.name || "No game type"} • {selected.blindSmall}/{selected.blindBig}
              </p>
            </div>

            {/* Open/Close */}
            <div className="px-5 py-3 border-b border-card-border">
              {selected.status === "OPEN" ? (
                <>
                  {activeSession?.dealer && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted">
                      <span className="text-accent-gold-dim">⦿</span>
                      <span>Dealer: <strong className="text-foreground">{activeSession.dealer.name}</strong></span>
                    </div>
                  )}
                  <button onClick={() => closeTable(selected.id)} className="w-full rounded-lg border border-danger/30 py-2 text-xs font-semibold tracking-wider uppercase text-danger hover:bg-danger/10 transition-colors cursor-pointer">
                    Close Table
                  </button>
                </>
              ) : (
                <>
                  {dealers.length > 0 && (
                    <div className="mb-2">
                      <label className="block text-[10px] text-muted mb-1 tracking-wider uppercase">Assign Dealer</label>
                      <select
                        value={selectedDealerId}
                        onChange={e => setSelectedDealerId(e.target.value)}
                        className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs outline-none cursor-pointer"
                        style={{ color: "var(--foreground)" }}
                      >
                        <option value="">No dealer</option>
                        {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={() => openTable(selected.id)} className="w-full rounded-lg py-2 text-xs font-semibold tracking-wider uppercase cursor-pointer" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                    Open Table
                  </button>
                </>
              )}
            </div>

            {/* Seated Players */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">
                Seats ({seatedPlayers.length}/{selected.seats})
              </h3>

              {selected.status === "OPEN" && (
                <div className="space-y-1 mb-4">
                  {Array.from({ length: selected.seats }, (_, i) => {
                    const seat = seatedPlayers.find(s => s.seatNumber === i + 1);
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ backgroundColor: seat ? "rgba(13, 74, 46, 0.15)" : "transparent" }}>
                        <span className="text-muted w-6">#{i + 1}</span>
                        {seat ? (
                          <>
                            <span className="flex-1 font-medium">{seat.player.firstName} {seat.player.lastName}</span>
                            <button onClick={() => unseatPlayer(selected.id, seat.id)} className="text-danger/60 hover:text-danger cursor-pointer ml-2">✕</button>
                          </>
                        ) : (
                          <span className="flex-1 text-muted/40 italic">Empty</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Seat player */}
              {selected.status === "OPEN" && (
                <div className="border-t border-card-border pt-3">
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-muted mb-2">Seat Player</h4>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      min={1}
                      max={selected.seats}
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(parseInt(e.target.value) || 1)}
                      className="w-16 rounded border border-card-border bg-transparent px-2 py-1.5 text-xs outline-none text-center"
                      style={{ color: "var(--foreground)" }}
                      placeholder="Seat"
                    />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Search player..."
                      className="flex-1 rounded border border-card-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-accent-gold/50"
                      style={{ color: "var(--foreground)" }}
                    />
                  </div>
                  {playerResults.length > 0 && (
                    <div className="rounded border border-card-border bg-card-bg max-h-32 overflow-y-auto">
                      {playerResults.map((p: PlayerOption) => (
                        <button
                          key={p.id}
                          onClick={() => seatPlayer(selected.id, p.id)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-felt-green/20 transition-colors cursor-pointer border-b border-card-border/50 last:border-0"
                        >
                          {p.firstName} {p.lastName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Waiting list */}
              {selected.waitingList.length > 0 && (
                <div className="border-t border-card-border pt-3 mt-3">
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-muted mb-2">Waiting List</h4>
                  {selected.waitingList.map((w) => (
                    <div key={w.id} className="flex items-center justify-between py-1 text-xs">
                      <span className="text-accent-gold-dim w-6">#{w.position}</span>
                      <span className="flex-1">{w.player.firstName} {w.player.lastName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
