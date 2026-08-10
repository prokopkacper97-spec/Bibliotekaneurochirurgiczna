"use client";

import { useState, FormEvent } from "react";
import type { Group } from "@/lib/types";

export default function GroupManagerModal({
  groups,
  onClose,
  onChanged,
}: {
  groups: Group[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createGroup(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się utworzyć grupy.");
      setNewName("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function renameGroup(id: string) {
    const name = (renaming[id] ?? "").trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zmienić nazwy.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(id: string, name: string) {
    if (!confirm(`Usunąć grupę „${name}”? Książki w niej pozostaną, ale staną się bez grupy.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Nie udało się usunąć grupy.");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <h2 className="font-display text-2xl font-bold mb-4 text-[var(--brass-light)]">
          Zarządzaj grupami
        </h2>

        <div className="space-y-2 mb-5 max-h-[45vh] overflow-y-auto pr-1">
          {groups.length === 0 && (
            <p className="text-sm text-[var(--parchment-dark)]">Nie masz jeszcze żadnych grup.</p>
          )}
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <input
                className="input flex-1"
                defaultValue={g.name}
                onChange={(e) => setRenaming((r) => ({ ...r, [g.id]: e.target.value }))}
              />
              <span className="text-xs text-[var(--parchment-dark)] w-16 text-right">
                {g._count?.books ?? 0} poz.
              </span>
              <button
                className="btn btn-outline !py-1.5 !px-2.5 text-xs"
                disabled={busy}
                onClick={() => renameGroup(g.id)}
              >
                Zapisz
              </button>
              <button
                className="btn btn-danger !py-1.5 !px-2.5 text-xs"
                disabled={busy}
                onClick={() => deleteGroup(g.id, g.name)}
              >
                Usuń
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={createGroup} className="flex items-center gap-2 border-t border-[rgba(201,163,92,0.25)] pt-4">
          <input
            className="input flex-1"
            placeholder="Nazwa nowej grupy, np. Neuroonkologia"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn btn-brass" disabled={busy}>
            Dodaj
          </button>
        </form>

        {error && <p className="text-sm text-red-300 mt-3">{error}</p>}

        <div className="flex justify-end pt-5">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
