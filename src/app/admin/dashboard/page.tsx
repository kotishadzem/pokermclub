"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useLiveData } from "@/lib/use-live-data";

interface TxRecord {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  player: { firstName: string; lastName: string };
  user: { name: string } | null;
}

interface DashboardStats {
  totalPlayers: number;
  openTables: number;
  todayRevenue: number;
  activeStaff: number;
  recentActivity: TxRecord[];
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeColor(type: string): string {
  if (type === "BUY_IN" || type === "DEPOSIT") return "var(--felt-green-light)";
  if (type === "CASH_OUT" || type === "WITHDRAWAL") return "var(--danger)";
  return "var(--accent-gold)";
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  useLiveData(fetchStats, 10000);

  const stats = [
    {
      label: "Total Players",
      value: loading ? "..." : String(data?.totalPlayers ?? 0),
      icon: "♟",
      accent: "var(--felt-green-light)",
    },
    {
      label: "Active Tables",
      value: loading ? "..." : String(data?.openTables ?? 0),
      icon: "▣",
      accent: "var(--accent-gold)",
    },
    {
      label: "Today's Revenue",
      value: loading ? "..." : `$${(data?.todayRevenue ?? 0).toFixed(2)}`,
      icon: "◈",
      accent: "var(--felt-green)",
    },
    {
      label: "Staff Online",
      value: loading ? "..." : String(data?.activeStaff ?? 0),
      icon: "⦿",
      accent: "var(--accent-gold-dim)",
    },
  ];

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome back, {session?.user?.name || "Admin"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Poker Club Management Dashboard
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group rounded-xl border border-card-border bg-card-bg/60 p-5 transition-all duration-300 hover:border-card-border/80 hover:bg-card-bg/80"
            style={{
              animation: "floatUp 0.5s ease-out forwards",
              animationDelay: `${i * 0.1}s`,
              opacity: 0,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="text-2xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  color: stat.accent,
                  filter: `drop-shadow(0 0 8px ${stat.accent}40)`,
                }}
              >
                {stat.icon}
              </span>
            </div>
            <p
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted tracking-wider uppercase font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 rounded-xl border border-card-border bg-card-bg/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border flex items-center gap-3">
          <span className="text-accent-gold-dim">♠</span>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-muted">
            Recent Activity
          </h3>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-muted text-sm">
            Loading...
          </div>
        ) : !data?.recentActivity?.length ? (
          <div className="px-6 py-8 text-center text-muted text-sm">
            No recent transactions
          </div>
        ) : (
          data.recentActivity.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center px-6 py-3 border-b border-card-border/50 last:border-0 hover:bg-card-border/20 transition-colors"
            >
              <div className="flex-1">
                <span
                  className="text-sm font-medium"
                  style={{ color: typeColor(tx.type) }}
                >
                  {formatType(tx.type)}
                </span>
                <span className="ml-2 text-xs text-muted">
                  {tx.player.firstName} {tx.player.lastName}
                </span>
                {tx.notes && (
                  <span className="ml-2 text-xs text-muted/60">
                    — {tx.notes}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span
                  className="text-sm font-bold"
                  style={{ color: typeColor(tx.type) }}
                >
                  ${tx.amount.toFixed(2)}
                </span>
                <p className="text-[10px] text-muted">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
