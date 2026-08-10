"use client";

import { useState, FormEvent } from "react";
import type { Book, Group } from "@/lib/types";

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Uploads a file straight to a Supabase Storage signed upload URL, with
 * real byte progress via XMLHttpRequest. This bypasses our own Vercel
 * function entirely, so it isn't subject to its 4.5MB request body limit.
 */
function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("apikey", ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${ANON_KEY}`);
    xhr.setRequestHeader("x-upsert", "false");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Przesyłanie pliku nie powiodło się (status ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Błąd sieci podczas przesyłania pliku."));
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    xhr.send(form);
  });
}

type Phase = "idle" | "preparing" | "uploading-pdf" | "uploading-cover" | "finalizing";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  preparing: "Przygotowywanie…",
  "uploading-pdf": "Wysyłanie pliku PDF…",
  "uploading-cover": "Wysyłanie okładki…",
  finalizing: "Zapisywanie w bibliotece…",
};

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
    setError(null);
    try {
      setPhase("preparing");
      setProgress(0);
      const prepRes = await fetch("/api/books/prepare-upload", { method: "POST" });
      const prep = await prepRes.json();
      if (!prepRes.ok) throw new Error(prep.error ?? "Nie udało się przygotować przesyłania.");

      setPhase("uploading-pdf");
      await uploadToSignedUrl(prep.pdf.signedUrl, file, setProgress);

      let hasCustomCover = false;
      if (cover) {
        setPhase("uploading-cover");
        setProgress(0);
        await uploadToSignedUrl(prep.cover.signedUrl, cover, setProgress);
        hasCustomCover = true;
      }

      setPhase("finalizing");
      const finalizeRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: prep.id,
          title,
          author,
          description,
          groupId: groupId || null,
          fileName: file.name,
          fileSize: file.size,
          hasCustomCover,
        }),
      });
      const book = await finalizeRes.json();
      if (!finalizeRes.ok) throw new Error(book.error ?? "Nie udało się dodać książki.");
      onCreated(book as Book);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : "Wystąpił błąd.";
      setError(name && name !== "Error" ? `${name}: ${message}` : message);
      setPhase("idle");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => !submitting && e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <h2 className="font-display text-2xl font-bold mb-4 text-[var(--brass-light)]">
          Dodaj książkę
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={submitting} className="space-y-4 border-0 p-0 m-0 min-w-0">
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
          </fieldset>

          {submitting && (
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--brass)] transition-[width] duration-150"
                  style={{
                    width: `${phase === "uploading-pdf" || phase === "uploading-cover" ? progress : 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[var(--parchment-dark)]">
                {phase === "uploading-pdf" || phase === "uploading-cover"
                  ? `${PHASE_LABEL[phase]} ${progress}%`
                  : PHASE_LABEL[phase]}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-brass" disabled={submitting}>
              {submitting ? `${PHASE_LABEL[phase]}` : "Dodaj do biblioteki"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
