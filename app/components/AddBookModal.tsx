"use client";

import { useState, FormEvent } from "react";
import type { Book, Group } from "@/lib/types";

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response, leave data as null
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
    };
    xhr.onerror = () => reject(new Error("Błąd sieci podczas wysyłania pliku."));
    xhr.send(formData);
  });
}

type Phase = "idle" | "uploading" | "processing";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submitting = phase !== "idle";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Wybierz plik PDF.");
      return;
    }
    setPhase("uploading");
    setProgress(0);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("author", author);
      form.set("description", description);
      if (groupId) form.set("groupId", groupId);
      form.set("file", file);
      if (cover) form.set("cover", cover);

      const { ok, data } = await uploadWithProgress("/api/books", form, (percent) => {
        setProgress(percent);
        if (percent >= 100) setPhase("processing");
      });
      const body = data as { error?: string } | Book | null;
      if (!ok) throw new Error((body as { error?: string })?.error ?? "Nie udało się dodać książki.");
      onCreated(body as Book);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
      setPhase("idle");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => !submitting && e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <h2 className="font-display text-2xl font-bold mb-4 text-[var(--brass-light)]">
          Dodaj książkę
        </h2>
        <fieldset disabled={submitting} className="contents">
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

            {submitting && (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brass)] transition-[width] duration-150"
                    style={{ width: `${phase === "processing" ? 100 : progress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--parchment-dark)]">
                  {phase === "uploading"
                    ? `Wysyłanie pliku… ${progress}%`
                    : "Przetwarzanie i generowanie okładki…"}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-brass" disabled={submitting}>
                {phase === "uploading"
                  ? `Wysyłanie… ${progress}%`
                  : phase === "processing"
                    ? "Przetwarzanie…"
                    : "Dodaj do biblioteki"}
              </button>
            </div>
          </form>
        </fieldset>
      </div>
    </div>
  );
}
