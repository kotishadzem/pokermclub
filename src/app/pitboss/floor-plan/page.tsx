"use client";

export default function FloorPlanPage() {
  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <h1
        className="text-2xl font-bold tracking-wide mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Floor Plan
      </h1>
      <p className="text-sm text-muted">
        Table layout and floor management — coming soon.
      </p>
      <div className="mt-8 rounded-xl border border-card-border bg-card-bg/40 p-12 flex items-center justify-center">
        <span className="text-4xl text-accent-gold-dim/30">◫</span>
      </div>
    </div>
  );
}
