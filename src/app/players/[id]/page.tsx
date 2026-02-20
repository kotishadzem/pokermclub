"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  user: { name: string };
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  idNumber: string | null;
  photo: string | null;
  birthday: string | null;
  notes: string | null;
  rakebackPercent: number;
  statusId: string | null;
  status: { id: string; name: string } | null;
  transactions: Transaction[];
}

interface PlayerStatus { id: string; name: string; }

const TX_LABELS: Record<string, string> = {
  BUY_IN: "Buy-In",
  CASH_OUT: "Cash-Out",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  RAKEBACK_PAYOUT: "Rakeback",
};

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [statuses, setStatuses] = useState<PlayerStatus[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string | number | null>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch(`/api/players/${id}`).then(r => r.json()).then((p) => {
      setPlayer(p);
      setForm({
        firstName: p.firstName, lastName: p.lastName, phone: p.phone || "",
        idNumber: p.idNumber || "", birthday: p.birthday ? p.birthday.split("T")[0] : "",
        notes: p.notes || "", statusId: p.statusId || "", rakebackPercent: p.rakebackPercent,
        photo: p.photo || "",
      });
    });
    fetch("/api/player-statuses").then(r => r.json()).then(setStatuses);
  }, [id]);

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      set("photo", data.url);
      await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: data.url }),
      });
      setPlayer(prev => prev ? { ...prev, photo: data.url } : prev);
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await fetch(`/api/players/${id}`).then(r => r.json());
    setPlayer(updated);
    setEditing(false);
    setSaving(false);
    setToast("Player updated");
    setTimeout(() => setToast(""), 3000);
  }

  if (!player) return <div className="text-center text-muted py-12">Loading...</div>;

  const balance = player.transactions.reduce((sum, t) => {
    if (t.type === "BUY_IN" || t.type === "DEPOSIT") return sum + t.amount;
    return sum - t.amount;
  }, 0);

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl" style={{ animation: "floatUp 0.3s ease-out", borderColor: "rgba(26, 107, 69, 0.5)", backgroundColor: "rgba(13, 74, 46, 0.9)", color: "var(--foreground)" }}>
          {toast}
        </div>
      )}

      {/* Back button */}
      <button onClick={() => router.push("/players/list")} className="text-xs text-muted hover:text-foreground tracking-wider uppercase mb-4 cursor-pointer transition-colors">
        ← Back to Players
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photo & Quick Info */}
        <div className="lg:col-span-1 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden aspect-square cursor-pointer hover:border-accent-gold/30 transition-colors"
          >
            {(form.photo || player.photo) ? (
              <img src={(form.photo as string) || player.photo!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-5xl text-muted/20 mb-2">♟</span>
                <span className="text-xs text-muted/40 tracking-wider uppercase">Upload photo</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

          {/* Quick stats */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted tracking-wider uppercase">Status</span>
              {player.status ? (
                <span className="rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase" style={{ backgroundColor: "rgba(13, 74, 46, 0.2)", color: "var(--felt-green-light)", border: "1px solid rgba(26, 107, 69, 0.3)" }}>
                  {player.status.name}
                </span>
              ) : <span className="text-xs text-muted">None</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted tracking-wider uppercase">Rakeback</span>
              <span className="text-sm text-accent-gold font-medium">{player.rakebackPercent}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted tracking-wider uppercase">Balance</span>
              <span className={`text-sm font-medium ${balance >= 0 ? "text-felt-green-light" : "text-danger"}`}>
                ${Math.abs(balance).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-card-border bg-card-bg/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                {editing ? "Edit Player" : `${player.firstName} ${player.lastName}`}
              </h1>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="rounded-lg border border-card-border px-4 py-2 text-xs font-medium tracking-wider uppercase text-accent-gold hover:bg-card-border/30 transition-colors cursor-pointer">
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} className="rounded-lg border border-card-border px-4 py-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">First Name</label>
                    <input type="text" value={form.firstName as string} onChange={(e) => set("firstName", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Last Name</label>
                    <input type="text" value={form.lastName as string} onChange={(e) => set("lastName", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Phone</label>
                    <input type="tel" value={form.phone as string} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">ID Number</label>
                    <input type="text" value={form.idNumber as string} onChange={(e) => set("idNumber", e.target.value)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Birthday</label>
                    <input type="date" value={form.birthday as string} onChange={(e) => set("birthday", e.target.value)} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Status</label>
                    <select value={form.statusId as string} onChange={(e) => set("statusId", e.target.value)} className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 cursor-pointer" style={{ color: "var(--foreground)" }}>
                      <option value="">None</option>
                      {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Rakeback %</label>
                    <input type="number" min="0" max="100" step="0.1" value={form.rakebackPercent as number} onChange={(e) => set("rakebackPercent", parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50" style={{ color: "var(--foreground)" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Notes</label>
                  <textarea value={form.notes as string} onChange={(e) => set("notes", e.target.value)} rows={3} className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 resize-none" style={{ color: "var(--foreground)" }} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div><span className="text-xs text-muted tracking-wider uppercase block mb-1">Phone</span><span>{player.phone || "—"}</span></div>
                <div><span className="text-xs text-muted tracking-wider uppercase block mb-1">ID Number</span><span>{player.idNumber || "—"}</span></div>
                <div><span className="text-xs text-muted tracking-wider uppercase block mb-1">Birthday</span><span>{player.birthday ? new Date(player.birthday).toLocaleDateString() : "—"}</span></div>
                <div><span className="text-xs text-muted tracking-wider uppercase block mb-1">Registered</span><span>{new Date(player.transactions?.[0]?.createdAt || Date.now()).toLocaleDateString()}</span></div>
                {player.notes && (
                  <div className="col-span-2"><span className="text-xs text-muted tracking-wider uppercase block mb-1">Notes</span><span className="text-muted">{player.notes}</span></div>
                )}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-muted">Recent Transactions</h3>
            </div>
            {player.transactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted text-sm">No transactions yet</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {player.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-card-border/50">
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold tracking-wider uppercase ${tx.type === "BUY_IN" || tx.type === "DEPOSIT" ? "text-felt-green-light" : "text-danger"}`}>
                          {TX_LABELS[tx.type] || tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-right">${tx.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-muted text-right">{tx.user.name}</td>
                      <td className="px-6 py-3 text-muted text-right">{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
