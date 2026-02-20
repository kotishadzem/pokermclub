"use client";

import { useSession } from "next-auth/react";

const stats = [
  {
    label: "Total Players",
    value: "0",
    icon: "♟",
    accent: "var(--felt-green-light)",
  },
  {
    label: "Active Tables",
    value: "0",
    icon: "▣",
    accent: "var(--accent-gold)",
  },
  {
    label: "Today's Revenue",
    value: "$0",
    icon: "◈",
    accent: "var(--felt-green)",
  },
  {
    label: "Staff Online",
    value: "1",
    icon: "⦿",
    accent: "var(--accent-gold-dim)",
  },
];

export default function AdminDashboard() {
  const { data: session } = useSession();

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

      {/* Quick info */}
      <div className="mt-8 rounded-xl border border-card-border bg-card-bg/40 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-accent-gold-dim">♠</span>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-muted">
            Getting Started
          </h3>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Configure your club by setting up game types, player statuses, and
          staff accounts from the sidebar. Then your pit boss can create tables
          and start managing the floor.
        </p>
      </div>
    </div>
  );
}
