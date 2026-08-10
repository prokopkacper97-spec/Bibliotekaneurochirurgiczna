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

async function uploadOneBook(
  file: File,
  meta: { title: string; author: string; description: string; groupId: string },
  cover: File | null,
  onProgress: (phase: UploadPhase, percent: number) => void
): Promise<Book> {
  onProgress("preparing", 0);
  const prepRes = await fetch("/api/books/prepare-upload", { method: "POST" });
  const prep = await prepRes.json();
  if (!prepRes.ok) throw new Error(prep.error ?? "Nie udało się przygotować przesyłania.");

  onProgress("uploading-pdf", 0);
  await uploadToSignedUrl(prep.pdf.signedUrl, file, (p) => onProgress("uploading-pdf", p));

  let hasCustomCover = false;
  if (cover) {
    onProgress("uploading-cover", 0);
    await uploadToSignedUrl(prep.cover.signedUrl, cover, (p) => onProgress("uploading-cover", p));
    hasCustomCover = true;
  }

  onProgress("finalizing", 100);
  const finalizeRes = await fetch("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: prep.id,
      title: meta.title,
      author: meta.author,
      description: meta.description,
      groupId: meta.groupId || null,
      fileName: file.name,
      fileSize: file.size,
      hasCustomCover,
    }),
  });
  const book = await finalizeRes.json();
  if (!finalizeRes.ok) throw new Error(book.error ?? "Nie udało się dodać książki.");
  return book as Book;
}

type UploadPhase = "preparing" | "uploading-pdf" | "uploading-cover" | "finalizing";

const PHASE_LABEL: Record<UploadPhase, string> = {
  preparing: "Przygotowywanie…",
  "uploading-pdf": "Wysyłanie pliku PDF…",
  "uploading-cover": "Wysyłanie okładki…",
  finalizing: "Zapisywanie w bibliotece…",
};

type FileResult = { name: string; status: "pending" | "active" | "done" | "error"; message?: string };

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
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<UploadPhase>("preparing");
  const [currentProgress, setCurrentProgress] = useState(0);
  const [results, setResults] = useState<FileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isBatch = files.length > 1;
  const finished = submitting === false && results.length > 0;
  const hasErrors = results.some((r) => r.status === "error");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Wybierz co najmniej jeden plik PDF.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const initialResults: FileResult[] = files.map((f) => ({ name: f.name, status: "pending" }));
    setResults(initialResults);

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "active" } : r)));
      try {
        const book = await uploadOneBook(
          files[i],
          {
            title: isBatch ? "" : title,
            author,
            description,
            groupId,
          },
          isBatch ? null : cover,
          (phase, percent) => {
            setCurrentPhase(phase);
            setCurrentProgress(percent);
          }
        );
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
        onCreated(book);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Wystąpił błąd.";
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", message } : r)));
      }
    }

    setSubmitting(false);
  }

  function handleDone() {
    if (hasErrors) {
      // Keep only the failed ones selected, so the user can retry just those.
      onClose();
    } else {
      onClose();
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => !submitting && e.target === e.currentTarget && onClose()}
    >
      <div className="modal-panel">
        <h2 className="font-display text-2xl font-bold mb-4 text-[var(--brass-light)]">
          Dodaj książki
        </h2>

        {!finished && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={submitting} className="space-y-4 border-0 p-0 m-0 min-w-0">
              <div>
                <label className="label">Plik(i) PDF *</label>
                <input
                  className="input"
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                <p className="text-xs mt-1 text-[var(--parchment-dark)] opacity-80">
                  Możesz zaznaczyć od razu kilka plików — trafią do biblioteki jeden po drugim.
                </p>
              </div>

              {!isBatch ? (
                <div>
                  <label className="label">Tytuł</label>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="np. Neurochirurgia. Podręcznik"
                  />
                  <p className="text-xs mt-1 text-[var(--parchment-dark)] opacity-80">
                    Jeśli zostawisz puste, użyjemy nazwy pliku PDF.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--parchment-dark)] opacity-80">
                  Wybrano {files.length} plików — tytuły zostaną ustawione na podstawie nazw plików
                  (możesz je później zmienić w edycji każdej książki).
                </p>
              )}

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
                {isBatch && (
                  <p className="text-xs mt-1 text-[var(--parchment-dark)] opacity-80">
                    Autor i opis zostaną zastosowane do wszystkich wybranych plików.
                  </p>
                )}
              </div>
              {!isBatch && (
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
              )}
            </fieldset>

            {submitting && (
              <div className="space-y-2">
                {isBatch && (
                  <p className="text-xs text-[var(--parchment-dark)]">
                    Plik {currentIndex + 1} z {files.length}: {files[currentIndex]?.name}
                  </p>
                )}
                <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brass)] transition-[width] duration-150"
                    style={{
                      width: `${currentPhase === "uploading-pdf" || currentPhase === "uploading-cover" ? currentProgress : 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--parchment-dark)]">
                  {currentPhase === "uploading-pdf" || currentPhase === "uploading-cover"
                    ? `${PHASE_LABEL[currentPhase]} ${currentProgress}%`
                    : PHASE_LABEL[currentPhase]}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-brass" disabled={submitting}>
                {submitting
                  ? PHASE_LABEL[currentPhase]
                  : isBatch
                    ? `Dodaj ${files.length} książek`
                    : "Dodaj do biblioteki"}
              </button>
            </div>
          </form>
        )}

        {finished && (
          <div className="space-y-4">
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {results.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      r.status === "done"
                        ? "text-emerald-400"
                        : r.status === "error"
                          ? "text-red-300"
                          : "text-[var(--parchment-dark)]"
                    }
                  >
                    {r.status === "done" ? "✓" : r.status === "error" ? "✗" : "…"}
                  </span>
                  <span className="text-[var(--parchment-dark)]">
                    {r.name}
                    {r.message && <span className="block text-xs text-red-300">{r.message}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {hasErrors && (
              <p className="text-sm text-red-300">
                Część plików nie została dodana. Możesz spróbować ponownie tylko z nimi.
              </p>
            )}
            <div className="flex justify-end pt-2">
              <button type="button" className="btn btn-brass" onClick={handleDone}>
                Gotowe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
