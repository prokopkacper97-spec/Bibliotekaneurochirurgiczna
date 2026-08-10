"use client";

import { useState, FormEvent } from "react";
import type { Book, Group } from "@/lib/types";

export default function AddBookModal({
  groups,
  defaultGroupId,
  onClose,
  onCreated,
}: {
  groups: Group[];
  defaultGroupId?: string | null;
  onClose: () => void;
  onCreated: (book: Book) => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Wybierz plik PDF.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("author", author);
      form.set("description", description);
      if (groupId) form.set("groupId", groupId);
      form.set("file", file);
      if (cover) form.set("cover", cover);

      const res = await fetch("/api/books", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się dodać książki.");
      onCreated(data as Book);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <h2 className="font-display text-2xl font-bold mb-4 text-[var(--brass-light)]">
          Dodaj książkę
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tytuł *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="np. Neurochirurgia. Podręcznik"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Autor</label>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div>
              <label className="label">Grupa</label>
              <select className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Bez grupy</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Opis</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Plik PDF *</label>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div>
            <label className="label">Własna okładka (opcjonalnie)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs mt-1 text-[var(--parchment-dark)] opacity-80">
              Jeśli nie wybierzesz obrazu, okładka zostanie wygenerowana automatycznie z pierwszej
              strony PDF.
            </p>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-brass" disabled={submitting}>
              {submitting ? "Dodawanie…" : "Dodaj do biblioteki"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
