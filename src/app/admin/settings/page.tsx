"use client";

import { useEffect, useState } from "react";
import { useCurrency, CURRENCIES } from "@/lib/currency";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: "rgba(26, 107, 69, 0.5)", backgroundColor: "rgba(13, 74, 46, 0.9)", color: "var(--foreground)" }}>
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const { currency, setCurrency } = useCurrency();
  const [toast, setToast] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);

  async function handleSelect(code: string) {
    if (code === currency.code || switching) return;
    setSwitching(code);
    await setCurrency(code);
    setSwitching(null);
    const info = CURRENCIES.find(c => c.code === code);
    setToast(`Currency switched to ${info?.name} (${info?.symbol})`);
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage club configuration</p>
      </div>

      {/* Currency Selection */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-lg" style={{ color: "var(--accent-gold)" }}>◈</span>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: "var(--foreground)" }}>Currency</h3>
            <p className="text-xs text-muted mt-0.5">Select the active currency for all monetary values</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CURRENCIES.map((c, i) => {
            const isActive = currency.code === c.code;
            const isLoading = switching === c.code;
            return (
              <button
                key={c.code}
                onClick={() => handleSelect(c.code)}
                disabled={isActive || !!switching}
                className="relative rounded-xl border p-5 text-center transition-all duration-300 cursor-pointer disabled:cursor-default group"
                style={{
                  animation: "floatUp 0.4s ease-out forwards",
                  animationDelay: `${i * 60}ms`,
                  opacity: 0,
                  borderColor: isActive ? "rgba(26, 107, 69, 0.6)" : "var(--card-border)",
                  backgroundColor: isActive ? "rgba(13, 74, 46, 0.15)" : "transparent",
                  boxShadow: isActive ? "0 0 20px rgba(26, 107, 69, 0.15), inset 0 1px 0 rgba(26, 107, 69, 0.1)" : "none",
                }}
              >
                {isActive && (
                  <span
                    className="absolute top-3 right-3 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: "var(--felt-green-light)",
                      boxShadow: "0 0 8px rgba(26, 107, 69, 0.6)",
                    }}
                  />
                )}
                <span
                  className="block text-3xl mb-2 transition-transform duration-200 group-hover:scale-110"
                  style={{
                    color: isActive ? "var(--felt-green-light)" : "var(--accent-gold-dim)",
                    filter: isActive ? "drop-shadow(0 0 8px rgba(26, 107, 69, 0.4))" : "none",
                  }}
                >
                  {isLoading ? "..." : c.symbol}
                </span>
                <span
                  className="block text-sm font-bold tracking-widest uppercase mb-0.5"
                  style={{ color: isActive ? "var(--foreground)" : "var(--foreground)" }}
                >
                  {c.code}
                </span>
                <span className="block text-[10px] tracking-wider uppercase text-muted">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
