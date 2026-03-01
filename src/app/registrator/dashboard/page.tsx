"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useLiveData } from "@/lib/use-live-data";

interface PlayerResult {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
}

interface RoomVisit {
  id: string;
  playerId: string;
  checkedIn: string;
  checkedOut: string | null;
  player: PlayerResult;
  user: { name: string };
}

function getNowLocal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function RegistratorDashboard() {
  const [inRoom, setInRoom] = useState(0);
  const [visits, setVisits] = useState<RoomVisit[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Check-in modal state
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [ciSearch, setCiSearch] = useState("");
  const [ciResults, setCiResults] = useState<PlayerResult[]>([]);
  const [ciSearching, setCiSearching] = useState(false);
  const [ciSelected, setCiSelected] = useState<PlayerResult | null>(null);
  const [ciDatetime, setCiDatetime] = useState(getNowLocal);

  // Check-out modal state
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [coSelected, setCoSelected] = useState<RoomVisit | null>(null);
  const [coDatetime, setCoDatetime] = useState(getNowLocal);

  const ciSearchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRoomData = useCallback(async () => {
    const res = await fetch("/api/room-visits");
    const data = await res.json();
    setInRoom(data.inRoom);
    setVisits(data.visits);
  }, []);

  useLiveData(fetchRoomData, 5000);

  const activeVisits = visits.filter((v) => !v.checkedOut);

  // Debounced search for check-in modal
  function handleCiSearchChange(value: string) {
    setCiSearch(value);
    setCiSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setCiResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCiSearching(true);
      try {
        const res = await fetch(`/api/players?search=${encodeURIComponent(value.trim())}`);
        const players = await res.json();
        setCiResults(players);
      } finally {
        setCiSearching(false);
      }
    }, 300);
  }

  function openCheckIn() {
    setCiSearch("");
    setCiResults([]);
    setCiSelected(null);
    setCiDatetime(getNowLocal());
    setCheckInOpen(true);
    setTimeout(() => ciSearchRef.current?.focus(), 100);
  }

  function openCheckOut() {
    setCoSelected(null);
    setCoDatetime(getNowLocal());
    setCheckOutOpen(true);
  }

  async function confirmCheckIn() {
    if (!ciSelected) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/room-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: ciSelected.id, checkedIn: ciDatetime }),
      });
      if (res.ok) {
        setCheckInOpen(false);
        await fetchRoomData();
      } else {
        const data = await res.json();
        alert(data.error || "Check-in failed");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmCheckOut() {
    if (!coSelected) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/room-visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: coSelected.id, checkedOut: coDatetime }),
      });
      if (res.ok) {
        setCheckOutOpen(false);
        await fetchRoomData();
      }
    } finally {
      setActionLoading(false);
    }
  }

  const isAlreadyInRoom = (playerId: string) =>
    activeVisits.some((v) => v.playerId === playerId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-wide"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          Registrator
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Player check-in & check-out
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={openCheckIn}
          className="relative overflow-hidden rounded-xl border px-6 py-6 text-center font-semibold uppercase tracking-widest transition-all duration-200 cursor-pointer"
          style={{
            borderColor: "rgba(26, 107, 69, 0.5)",
            background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
            color: "var(--foreground)",
            fontSize: "1rem",
            boxShadow: "0 4px 24px rgba(13, 74, 46, 0.4)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="10" y1="4" x2="10" y2="16" />
              <line x1="4" y1="10" x2="16" y2="10" />
            </svg>
            Check In
          </span>
        </button>

        <button
          onClick={openCheckOut}
          className="relative overflow-hidden rounded-xl border px-6 py-6 text-center font-semibold uppercase tracking-widest transition-all duration-200 cursor-pointer"
          style={{
            borderColor: "rgba(199, 69, 69, 0.4)",
            background: "linear-gradient(135deg, #5c1a1a, var(--danger))",
            color: "var(--foreground)",
            fontSize: "1rem",
            boxShadow: "0 4px 24px rgba(199, 69, 69, 0.25)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="10" x2="16" y2="10" />
            </svg>
            Check Out
          </span>
        </button>
      </div>

      {/* In Room Counter */}
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "var(--card-border)",
          background: "var(--card-bg)",
        }}
      >
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
          Players in Room
        </p>
        <p
          className="text-7xl font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--accent-gold)",
            textShadow: "0 0 20px rgba(201, 168, 76, 0.3)",
          }}
        >
          {inRoom}
        </p>
      </div>

      {/* Active Visits (read-only) */}
      <div
        className="rounded-xl border"
        style={{
          borderColor: "var(--card-border)",
          background: "var(--card-bg)",
        }}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
            Currently in Room ({activeVisits.length})
          </h2>
          <Link
            href="/players/register"
            className="text-xs font-medium tracking-wider transition-colors duration-200"
            style={{ color: "var(--accent-gold)" }}
          >
            + New Player
          </Link>
        </div>

        {activeVisits.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No players currently in the room
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {activeVisits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
                      color: "var(--foreground)",
                    }}
                  >
                    {visit.player.firstName.charAt(0)}
                    {visit.player.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {visit.player.firstName} {visit.player.lastName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      In since {new Date(visit.checkedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}by {visit.user.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Check-In Modal ── */}
      {checkInOpen && (
        <ModalBackdrop onClose={() => setCheckInOpen(false)}>
          <div
            className="rounded-xl border p-6 w-full max-w-md mx-auto"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card-bg)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold tracking-wide mb-5"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Check In Player
            </h3>

            {/* Search */}
            <input
              ref={ciSearchRef}
              type="text"
              value={ciSearch}
              onChange={(e) => handleCiSearchChange(e.target.value)}
              placeholder="Search player by name..."
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            />

            {/* Search results */}
            <div
              className="mt-3 max-h-52 overflow-y-auto space-y-1 rounded-lg"
              style={{ scrollbarWidth: "thin" }}
            >
              {ciSearching && (
                <p className="text-xs py-3 text-center" style={{ color: "var(--muted)" }}>
                  Searching...
                </p>
              )}
              {!ciSearching && ciSearch && ciResults.length === 0 && (
                <p className="text-xs py-3 text-center" style={{ color: "var(--muted)" }}>
                  No players found
                </p>
              )}
              {ciResults.map((player) => {
                const alreadyIn = isAlreadyInRoom(player.id);
                const selected = ciSelected?.id === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => !alreadyIn && setCiSelected(player)}
                    disabled={alreadyIn}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 cursor-pointer"
                    style={{
                      background: selected
                        ? "rgba(13, 74, 46, 0.35)"
                        : "transparent",
                      borderLeft: selected ? "3px solid var(--felt-green-light)" : "3px solid transparent",
                      opacity: alreadyIn ? 0.4 : 1,
                    }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
                        color: "var(--foreground)",
                      }}
                    >
                      {player.firstName.charAt(0)}
                      {player.lastName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {player.firstName} {player.lastName}
                    </span>
                    {alreadyIn && (
                      <span className="ml-auto text-xs" style={{ color: "var(--accent-gold)" }}>
                        In room
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected indicator */}
            {ciSelected && (
              <div
                className="mt-3 rounded-lg px-4 py-2.5 flex items-center gap-2"
                style={{ background: "rgba(13, 74, 46, 0.2)", border: "1px solid rgba(26, 107, 69, 0.3)" }}
              >
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Selected:</span>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {ciSelected.firstName} {ciSelected.lastName}
                </span>
              </div>
            )}

            {/* DateTime */}
            <div className="mt-4">
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>
                Check-in time
              </label>
              <input
                type="datetime-local"
                value={ciDatetime}
                onChange={(e) => setCiDatetime(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCheckInOpen(false)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--muted)",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckIn}
                disabled={!ciSelected || actionLoading}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
                  color: "var(--foreground)",
                }}
              >
                {actionLoading ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ── Check-Out Modal ── */}
      {checkOutOpen && (
        <ModalBackdrop onClose={() => setCheckOutOpen(false)}>
          <div
            className="rounded-xl border p-6 w-full max-w-md mx-auto"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card-bg)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold tracking-wide mb-5"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Check Out Player
            </h3>

            {/* Player list */}
            <div
              className="max-h-64 overflow-y-auto space-y-1 rounded-lg"
              style={{ scrollbarWidth: "thin" }}
            >
              {activeVisits.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
                  No players in room
                </p>
              ) : (
                activeVisits.map((visit) => {
                  const selected = coSelected?.id === visit.id;
                  return (
                    <button
                      key={visit.id}
                      onClick={() => setCoSelected(visit)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 cursor-pointer"
                      style={{
                        background: selected
                          ? "rgba(199, 69, 69, 0.15)"
                          : "transparent",
                        borderLeft: selected ? "3px solid var(--danger)" : "3px solid transparent",
                      }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
                          color: "var(--foreground)",
                        }}
                      >
                        {visit.player.firstName.charAt(0)}
                        {visit.player.lastName.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium block" style={{ color: "var(--foreground)" }}>
                          {visit.player.firstName} {visit.player.lastName}
                        </span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          Since {new Date(visit.checkedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected indicator */}
            {coSelected && (
              <div
                className="mt-3 rounded-lg px-4 py-2.5 flex items-center gap-2"
                style={{ background: "rgba(199, 69, 69, 0.1)", border: "1px solid rgba(199, 69, 69, 0.25)" }}
              >
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Selected:</span>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {coSelected.player.firstName} {coSelected.player.lastName}
                </span>
              </div>
            )}

            {/* DateTime */}
            <div className="mt-4">
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>
                Check-out time
              </label>
              <input
                type="datetime-local"
                value={coDatetime}
                onChange={(e) => setCoDatetime(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCheckOutOpen(false)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--muted)",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckOut}
                disabled={!coSelected || actionLoading}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #5c1a1a, var(--danger))",
                  color: "var(--foreground)",
                }}
              >
                {actionLoading ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

/* ── Modal Backdrop ── */
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
    >
      {children}
    </div>
  );
}
