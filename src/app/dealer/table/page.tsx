"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiveData } from "@/lib/use-live-data";

interface SeatData {
  id: string;
  seatNumber: number;
  player: { id: string; firstName: string; lastName: string };
  buyInAmount: number;
}

interface RakeEntry {
  id: string;
  potAmount: number;
  rakeAmount: number;
  tipAmount: number;
  createdAt: string;
}

interface TableSessionData {
  id: string;
  table: {
    id: string;
    name: string;
    seats: number;
    blindSmall: number;
    blindBig: number;
    gameType: { name: string } | null;
  };
  seats: SeatData[];
  rakeRecords: RakeEntry[];
}

interface MyTableResponse {
  assigned: boolean;
  tableSession: TableSessionData | null;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: "rgba(26, 107, 69, 0.5)", backgroundColor: "rgba(13, 74, 46, 0.9)", color: "var(--foreground)" }}>
      {message}
    </div>
  );
}

export default function DealerTablePage() {
  const [data, setData] = useState<MyTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [potAmount, setPotAmount] = useState("");
  const [rakeAmount, setRakeAmount] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchTable = useCallback(async () => {
    const res = await fetch("/api/dealer/my-table");
    if (res.ok) {
      setData(await res.json());
    } else {
      setData({ assigned: false, tableSession: null });
    }
    setLoading(false);
  }, []);

  useLiveData(fetchTable, 3000);

  async function recordRake() {
    if (!data?.tableSession || !potAmount || !rakeAmount) return;
    setSubmitting(true);
    const res = await fetch("/api/rake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableSessionId: data.tableSession.id,
        potAmount: parseFloat(potAmount),
        rakeAmount: parseFloat(rakeAmount),
        tipAmount: tipAmount ? parseFloat(tipAmount) : 0,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setToast(`Rake $${parseFloat(rakeAmount).toFixed(2)} recorded`);
      setPotAmount("");
      setRakeAmount("");
      setTipAmount("");
      fetchTable();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted">
        Loading...
      </div>
    );
  }

  if (!data?.assigned || !data.tableSession) {
    return (
      <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>My Table</h1>
        </div>
        <div className="rounded-xl border border-card-border bg-card-bg/40 p-12 flex flex-col items-center justify-center text-center">
          <span className="text-4xl text-accent-gold-dim/30 mb-4">▣</span>
          <p className="text-sm text-muted mb-1">No table assigned</p>
          <p className="text-xs text-muted/60">Ask the Pit Boss to assign you to a table</p>
        </div>
      </div>
    );
  }

  const session = data.tableSession;
  const table = session.table;
  const seats = session.seats;
  const rakeHistory = session.rakeRecords;
  const totalRake = rakeHistory.reduce((sum, r) => sum + r.rakeAmount, 0);
  const totalPots = rakeHistory.reduce((sum, r) => sum + r.potAmount, 0);
  const totalTips = rakeHistory.reduce((sum, r) => sum + r.tipAmount, 0);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{table.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {table.gameType?.name || "No game type"} &bull; {table.blindSmall}/{table.blindBig} blinds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Seat Map */}
        <div className="lg:col-span-2 rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">
              Seats ({seats.length}/{table.seats})
            </h3>
            <span className="text-xs font-medium" style={{ color: "var(--felt-green-light)" }}>● Active</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: table.seats }, (_, i) => {
                const seat = seats.find(s => s.seatNumber === i + 1);
                return (
                  <div
                    key={i}
                    className="rounded-lg border p-3 text-center transition-colors"
                    style={{
                      borderColor: seat ? "rgba(26, 107, 69, 0.4)" : "var(--card-border)",
                      backgroundColor: seat ? "rgba(13, 74, 46, 0.12)" : "transparent",
                    }}
                  >
                    <p className="text-[10px] text-muted mb-1 tracking-wider">SEAT {i + 1}</p>
                    {seat ? (
                      <>
                        <p className="text-sm font-medium">{seat.player.firstName} {seat.player.lastName}</p>
                        {seat.buyInAmount > 0 && (
                          <p className="text-[10px] text-accent-gold-dim mt-0.5">${seat.buyInAmount.toFixed(2)}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted/40 italic">Empty</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rake Panel */}
        <div className="space-y-4">
          {/* Session Stats */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 p-5">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Session Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Total Pots</span>
                <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>${totalPots.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Total Rake</span>
                <span className="text-sm font-bold" style={{ color: "var(--accent-gold)" }}>${totalRake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Total Tips</span>
                <span className="text-sm font-bold" style={{ color: "var(--felt-green-light)" }}>${totalTips.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Hands</span>
                <span className="text-sm font-bold">{rakeHistory.length}</span>
              </div>
            </div>
          </div>

          {/* Record Rake */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 p-5">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted mb-3">Record Rake</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-muted mb-1">Pot Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.50"
                  value={potAmount}
                  onChange={e => setPotAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted mb-1">Rake Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.25"
                  value={rakeAmount}
                  onChange={e => setRakeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted mb-1">Tip Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.25"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <button
                onClick={recordRake}
                disabled={!potAmount || !rakeAmount || parseFloat(rakeAmount) <= 0 || submitting}
                className="w-full rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-opacity"
                style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
              >
                {submitting ? "..." : "Record"}
              </button>
            </div>
          </div>

          {/* Recent Rake */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-card-border">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-muted">Recent Rake</h3>
            </div>
            {rakeHistory.length === 0 ? (
              <div className="px-5 py-6 text-center text-muted text-xs">No rake recorded yet</div>
            ) : (
              rakeHistory.map(r => (
                <div key={r.id} className="flex items-center px-5 py-2.5 border-b border-card-border/50 last:border-0 text-xs">
                  <span className="flex-1 text-muted">{new Date(r.createdAt).toLocaleTimeString()}</span>
                  <span className="text-muted mr-3">Pot: ${r.potAmount.toFixed(2)}</span>
                  <span className="font-bold mr-3" style={{ color: "var(--accent-gold)" }}>${r.rakeAmount.toFixed(2)}</span>
                  {r.tipAmount > 0 && <span className="font-medium" style={{ color: "var(--felt-green-light)" }}>+${r.tipAmount.toFixed(2)} tip</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
