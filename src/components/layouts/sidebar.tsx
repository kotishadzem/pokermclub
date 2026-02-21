"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_CONFIG: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "◈" },
    { label: "Users", href: "/admin/users", icon: "⦿" },
    { label: "Game Types", href: "/admin/game-types", icon: "♠" },
    { label: "Player Statuses", href: "/admin/player-statuses", icon: "★" },
    { label: "Tables", href: "/admin/tables", icon: "▣" },
    { label: "Bank Accounts", href: "/admin/bank-accounts", icon: "🏦" },
    { label: "Opening Balances", href: "/admin/opening-balances", icon: "◎" },
    { label: "Rakeback", href: "/admin/rakeback-config", icon: "%" },
    { label: "Players", href: "/players/list", icon: "♟" },
  ],
  PITBOSS: [
    { label: "Floor Plan", href: "/pitboss/floor-plan", icon: "◫" },
    { label: "Tables", href: "/pitboss/tables", icon: "▣" },
    { label: "Waiting List", href: "/pitboss/waiting-list", icon: "☰" },
    { label: "Players", href: "/players/list", icon: "♟" },
  ],
  CASHIER: [
    { label: "Dashboard", href: "/cashier/dashboard", icon: "◈" },
    { label: "Transactions", href: "/cashier/transactions", icon: "⇄" },
    { label: "Reports", href: "/cashier/reports", icon: "▤" },
    { label: "Players", href: "/players/list", icon: "♟" },
  ],
  DEALER: [
    { label: "My Table", href: "/dealer/table", icon: "▣" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  PITBOSS: "Pit Boss",
  CASHIER: "Cashier",
  DEALER: "Dealer",
};

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_CONFIG[role] || [];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-card-bg/90 backdrop-blur-sm text-accent-gold lg:hidden cursor-pointer"
        aria-label="Toggle menu"
      >
        <span className="text-lg">{mobileOpen ? "✕" : "☰"}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 flex flex-col
          border-r border-card-border bg-card-bg/95 backdrop-blur-xl
          transition-transform duration-300
          lg:translate-x-0 lg:static
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-card-border">
          <span
            className="text-2xl"
            style={{
              color: "var(--accent-gold)",
              filter: "drop-shadow(0 0 8px rgba(201, 168, 76, 0.2))",
            }}
          >
            ♠
          </span>
          <div>
            <h2
              className="text-sm font-bold tracking-widest uppercase"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--foreground)",
              }}
            >
              Poker Club
            </h2>
            <p
              className="text-[10px] tracking-wider uppercase"
              style={{ color: "var(--accent-gold-dim)" }}
            >
              {ROLE_LABELS[role] || role}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm
                      transition-all duration-200
                      ${isActive
                        ? "bg-felt-green/30 text-accent-gold"
                        : "text-muted hover:text-foreground hover:bg-card-border/30"
                      }
                    `}
                  >
                    <span
                      className={`
                        text-base transition-transform duration-200
                        group-hover:scale-110
                        ${isActive ? "text-accent-gold" : ""}
                      `}
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium tracking-wide">{item.label}</span>
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: "var(--accent-gold)",
                          boxShadow: "0 0 6px rgba(201, 168, 76, 0.5)",
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-card-border px-4 py-4">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
                color: "var(--foreground)",
              }}
            >
              {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-[10px] text-muted tracking-wider uppercase">
                {ROLE_LABELS[role] || role}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-card-border px-3 py-2 text-xs font-medium tracking-wider uppercase text-muted transition-all duration-200 hover:border-danger/30 hover:text-danger hover:bg-danger/5 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
