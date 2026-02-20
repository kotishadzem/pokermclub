"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PlayerStatus { id: string; name: string; }
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  idNumber: string | null;
  photo: string | null;
  rakebackPercent: number;
  status: PlayerStatus | null;
}

export default function PlayerListPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [statuses, setStatuses] = useState<PlayerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/player-statuses").then(r => r.json()).then(setStatuses);
  }, []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("statusId", statusFilter);
    const res = await fetch(`/api/players?${params}`);
    setPlayers(await res.json());
    setLoading(false);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Players</h1>
          <p className="mt-1 text-sm text-muted">{players.length} registered players</p>
        </div>
        <Link
          href="/players/register"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all no-underline"
          style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
        >
          + Register Player
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">⌕</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or ID..."
            className="w-full rounded-lg border border-card-border bg-card-bg/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 transition-colors"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 cursor-pointer min-w-[160px]"
          style={{ color: "var(--foreground)" }}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted w-12"></th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Phone</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">ID Number</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Rakeback</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : players.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No players found</td></tr>
            ) : (
              players.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/players/${p.id}`)}
                  className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    {p.photo ? (
                      <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-card-border" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                      >
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium">{p.firstName} {p.lastName}</td>
                  <td className="px-5 py-3 text-muted">{p.phone || "—"}</td>
                  <td className="px-5 py-3 text-muted">{p.idNumber || "—"}</td>
                  <td className="px-5 py-3">
                    {p.status ? (
                      <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase" style={{ backgroundColor: "rgba(13, 74, 46, 0.2)", color: "var(--felt-green-light)", border: "1px solid rgba(26, 107, 69, 0.3)" }}>
                        {p.status.name}
                      </span>
                    ) : (
                      <span className="text-muted/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-accent-gold-dim">{p.rakebackPercent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
