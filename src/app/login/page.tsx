"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUITS = ["♠", "♣", "♥", "♦"];

function FloatingSuits() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => {
        const suit = SUITS[i % 4];
        const isRed = suit === "♥" || suit === "♦";
        return (
          <span
            key={i}
            className="absolute select-none"
            style={{
              left: `${5 + (i * 47) % 90}%`,
              top: `${8 + (i * 31) % 85}%`,
              fontSize: `${14 + (i % 5) * 6}px`,
              color: isRed
                ? "rgba(180, 60, 60, 0.07)"
                : "rgba(201, 168, 76, 0.06)",
              animation: `drift ${18 + (i % 7) * 4}s ease-in-out infinite`,
              animationDelay: `${-(i * 1.3)}s`,
            }}
          >
            {suit}
          </span>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Radial ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "800px",
          height: "800px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(ellipse at center, rgba(13, 74, 46, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Corner vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <FloatingSuits />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{ animation: "floatUp 0.8s ease-out forwards" }}
      >
        {/* Gold accent line top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent mb-8" />

        <div className="rounded-2xl border border-card-border bg-card-bg/80 backdrop-blur-xl p-10 shadow-2xl shadow-black/40">
          {/* Logo / Branding */}
          <div className="flex flex-col items-center mb-10">
            {/* Spade icon */}
            <div className="relative mb-4">
              <span
                className="text-5xl block"
                style={{
                  color: "var(--accent-gold)",
                  filter: "drop-shadow(0 0 12px rgba(201, 168, 76, 0.3))",
                  animation: "goldShimmer 4s ease-in-out infinite",
                }}
              >
                ♠
              </span>
            </div>

            <h1
              className="text-2xl font-bold tracking-wider uppercase"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.15em",
                color: "var(--foreground)",
              }}
            >
              Poker Club
            </h1>
            <p
              className="mt-1.5 text-xs tracking-widest uppercase"
              style={{ color: "var(--muted)" }}
            >
              Management System
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-card-border" />
            <span
              className="text-[10px] tracking-[0.2em] uppercase"
              style={{ color: "var(--accent-gold-dim)" }}
            >
              Staff Login
            </span>
            <div className="flex-1 h-px bg-card-border" />
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mb-6 rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: "rgba(199, 69, 69, 0.3)",
                backgroundColor: "rgba(199, 69, 69, 0.08)",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: "var(--muted)" }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border bg-transparent px-4 py-3 text-sm transition-all duration-200 outline-none placeholder:text-muted/40 focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/20"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--foreground)",
                }}
                placeholder="Enter username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: "var(--muted)" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border bg-transparent px-4 py-3 text-sm transition-all duration-200 outline-none placeholder:text-muted/40 focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/20"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--foreground)",
                }}
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full mt-3 rounded-lg py-3.5 text-sm font-semibold tracking-wider uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, var(--felt-green) 0%, var(--felt-green-light) 100%)",
                color: "var(--foreground)",
                boxShadow: "0 4px 20px rgba(13, 74, 46, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 28px rgba(13, 74, 46, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(13, 74, 46, 0.3)";
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Gold accent line bottom */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent mt-8" />

        {/* Bottom decorative suits */}
        <div
          className="flex justify-center gap-3 mt-5 text-xs"
          style={{ color: "var(--accent-gold-dim)", opacity: 0.5 }}
        >
          <span>♠</span>
          <span>♥</span>
          <span>♣</span>
          <span>♦</span>
        </div>
      </div>
    </div>
  );
}
