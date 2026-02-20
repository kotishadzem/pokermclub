"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PlayerStatus { id: string; name: string; }

export default function RegisterPlayerPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<PlayerStatus[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", idNumber: "",
    birthday: "", notes: "", statusId: "", rakebackPercent: 0,
  });

  useEffect(() => {
    fetch("/api/player-statuses").then(r => r.json()).then(setStatuses);
  }, []);

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setPhotoUrl(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photo: photoUrl || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to register player");
        setSubmitting(false);
        return;
      }

      const player = await res.json();
      router.push(`/players/${player.id}`);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Register Player</h1>
        <p className="mt-1 text-sm text-muted">Add a new player to the club</p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "rgba(199, 69, 69, 0.3)", backgroundColor: "rgba(199, 69, 69, 0.08)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo upload */}
          <div className="lg:col-span-1">
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-card-border bg-card-bg/40 flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-accent-gold/30 transition-colors overflow-hidden"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-3xl text-muted/30 mb-2">♟</span>
                  <span className="text-xs text-muted tracking-wider uppercase">Click to upload photo</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>

          {/* Form fields */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">First Name *</label>
                <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Last Name *</label>
                <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">ID Number</label>
                <input type="text" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Birthday</label>
                <input type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Status</label>
                <select value={form.statusId} onChange={(e) => set("statusId", e.target.value)} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 cursor-pointer" style={{ color: "var(--foreground)" }}>
                  <option value="">No Status</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Rakeback %</label>
              <input type="number" min="0" max="100" step="0.1" value={form.rakebackPercent} onChange={(e) => set("rakebackPercent", parseFloat(e.target.value) || 0)} className="w-full max-w-[200px] rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none" style={{ color: "var(--foreground)" }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg px-8 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
              >
                {submitting ? "Registering..." : "Register Player"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-card-border px-6 py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
