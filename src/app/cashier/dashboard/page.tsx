"use client";

export default function CashierDashboard() {
  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <h1
        className="text-2xl font-bold tracking-wide mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Cashier Dashboard
      </h1>
      <p className="text-sm text-muted">
        Transaction management and reports — coming soon.
      </p>
      <div className="mt-8 rounded-xl border border-card-border bg-card-bg/40 p-12 flex items-center justify-center">
        <span className="text-4xl text-accent-gold-dim/30">◈</span>
      </div>
    </div>
  );
}
