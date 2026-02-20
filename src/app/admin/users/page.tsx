"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES = ["ADMIN", "PITBOSS", "CASHIER", "DEALER"];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PITBOSS: "Pit Boss",
  CASHIER: "Cashier",
  DEALER: "Dealer",
};

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl backdrop-blur-sm"
      style={{
        animation: "floatUp 0.3s ease-out",
        borderColor: type === "success" ? "rgba(26, 107, 69, 0.5)" : "rgba(199, 69, 69, 0.5)",
        backgroundColor: type === "success" ? "rgba(13, 74, 46, 0.9)" : "rgba(120, 30, 30, 0.9)",
        color: "var(--foreground)",
      }}
    >
      {message}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({ username: "", password: "", name: "", role: "DEALER" });

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setEditUser(null);
    setForm({ username: "", password: "", name: "", role: "DEALER" });
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({ username: user.username, password: "", name: user.name, role: user.role });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editUser) {
        const body: Record<string, string> = { name: form.name, role: form.role, username: form.username };
        if (form.password) body.password = form.password;
        await fetch(`/api/users/${editUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setToast({ message: "User updated", type: "success" });
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          setToast({ message: err.error || "Failed to create user", type: "error" });
          return;
        }
        setToast({ message: "User created", type: "success" });
      }
      setModalOpen(false);
      fetchUsers();
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
  }

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    setToast({ message: user.active ? "User deactivated" : "User activated", type: "success" });
    fetchUsers();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await fetch(`/api/users/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setToast({ message: "User deactivated", type: "success" });
    fetchUsers();
  }

  return (
    <div style={{ animation: "floatUp 0.5s ease-out forwards" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            Staff Users
          </h1>
          <p className="mt-1 text-sm text-muted">Manage staff accounts and roles</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))",
            color: "var(--foreground)",
          }}
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card-bg/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Username</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold tracking-wider uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No users found</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors">
                  <td className="px-5 py-3 font-medium">{user.name}</td>
                  <td className="px-5 py-3 text-muted">{user.username}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase"
                      style={{
                        backgroundColor: "rgba(13, 74, 46, 0.2)",
                        color: "var(--felt-green-light)",
                        border: "1px solid rgba(26, 107, 69, 0.3)",
                      }}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(user)}
                      className="cursor-pointer text-xs font-medium tracking-wider uppercase"
                      style={{ color: user.active ? "var(--felt-green-light)" : "var(--danger)" }}
                    >
                      {user.active ? "● Active" : "○ Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(user)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-accent-gold hover:text-accent-gold/80 mr-3 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDelete(user)} className="cursor-pointer text-xs font-medium tracking-wider uppercase text-danger/70 hover:text-danger transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl border border-card-border bg-card-bg shadow-2xl"
            style={{ animation: "floatUp 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--accent-gold)" }}>
                {editUser ? "Edit User" : "Add User"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">
                  Password {editUser && <span className="normal-case text-muted/60">(leave blank to keep)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editUser}
                  className="w-full rounded-lg border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-muted mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm outline-none focus:border-accent-gold/50 cursor-pointer"
                  style={{ color: "var(--foreground)" }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase transition-all cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--felt-green), var(--felt-green-light))", color: "var(--foreground)" }}
                >
                  {editUser ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div
            className="w-full max-w-sm rounded-xl border border-card-border bg-card-bg p-6 shadow-2xl"
            style={{ animation: "floatUp 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--danger)" }}>
              Deactivate User
            </h3>
            <p className="text-sm text-muted mb-5">
              Deactivate <strong className="text-foreground">{confirmDelete.name}</strong>? They won&apos;t be able to log in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wider uppercase cursor-pointer"
                style={{ backgroundColor: "rgba(199, 69, 69, 0.2)", color: "var(--danger)", border: "1px solid rgba(199, 69, 69, 0.3)" }}
              >
                Deactivate
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
