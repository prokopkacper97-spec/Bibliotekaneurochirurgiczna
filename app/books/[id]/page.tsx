"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Book, Group } from "@/lib/types";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverBust, setCoverBust] = useState(0);

  useEffect(() => {
    (async () => {
      const [bookRes, groupsRes] = await Promise.all([
        fetch(`/api/books/${id}`),
        fetch("/api/groups"),
      ]);
      if (!bookRes.ok) {
        setNotFound(true);
        return;
      }
      const b: Book = await bookRes.json();
      setBook(b);
      setTitle(b.title);
      setAuthor(b.author ?? "");
      setDescription(b.description ?? "");
      setGroupId(b.groupId ?? "");
      setGroups(await groupsRes.json());
    })();
  }, [id]);

  async function saveChanges() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          description,
          groupId: groupId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać zmian.");
      setBook(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook() {
    if (!book) return;
    if (!confirm(`Usunąć „${book.title}” z biblioteki? Tej operacji nie można cofnąć.`)) return;
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      alert("Nie udało się usunąć książki.");
    }
  }

  async function replaceCover(file: File) {
    const form = new FormData();
    form.set("cover", file);
    const res = await fetch(`/api/books/${id}/cover`, { method: "POST", body: form });
    if (res.ok) {
      setCoverBust((n) => n + 1);
    } else {
      alert("Nie udało się zmienić okładki.");
    }
  }

  if (notFound) {
    return (
      <div className="library-shell flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl text-[var(--brass-light)] mb-4">
            Nie znaleziono książki
          </p>
          <Link href="/" className="btn btn-brass">
            Powrót do biblioteki
          </Link>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="library-shell flex-1 flex items-center justify-center">
        <p className="text-[var(--parchment-dark)]">Ładowanie…</p>
      </div>
    );
  }

  return (
    <div className="library-shell flex-1 flex flex-col">
      <header className="library-header px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-[var(--brass-light)] hover:underline text-sm">
            ← Powrót do biblioteki
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 grid md:grid-cols-[280px_1fr] gap-8">
        <div className="space-y-4">
          <div className="book-cover !w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={coverBust}
              src={`/api/books/${id}/cover?v=${coverBust}`}
              alt={`Okładka: ${book.title}`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <label className="btn btn-outline w-full justify-center cursor-pointer">
            Zmień okładkę
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) replaceCover(f);
              }}
            />
          </label>
          <a
            href={`/api/books/${id}/download`}
            className="btn btn-brass w-full justify-center"
            onClick={() =>
              setBook((b) => (b ? { ...b, downloadCount: b.downloadCount + 1 } : b))
            }
          >
            ⬇ Pobierz PDF
          </a>
          <p className="text-center text-xs text-[var(--parchment-dark)] opacity-70">
            Pobrano {book.downloadCount} {book.downloadCount === 1 ? "raz" : "razy"}
          </p>
          <button className="btn btn-danger w-full justify-center" onClick={deleteBook}>
            Usuń książkę
          </button>
        </div>

        <div className="parchment-panel p-6 md:p-8 space-y-5">
          {!editing ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold">{book.title}</h1>
                {book.author && <p className="text-lg opacity-80 mt-1">{book.author}</p>}
                <p className="mt-2">
                  {book.group ? (
                    <span className="tag-pill !bg-[rgba(90,70,50,0.12)] !text-[var(--ink-soft)] !border-[rgba(90,70,50,0.3)]">
                      {book.group.name}
                    </span>
                  ) : (
                    <span className="text-sm opacity-60">Bez grupy</span>
                  )}
                </p>
              </div>
              <button className="btn btn-outline !text-[var(--ink)] !border-[var(--ink)]/30" onClick={() => setEditing(true)}>
                Edytuj
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label !text-[var(--ink-soft)]">Tytuł</label>
                <input
                  className="input !bg-white/60 !text-[var(--ink)] !border-[var(--ink)]/20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label !text-[var(--ink-soft)]">Autor</label>
                  <input
                    className="input !bg-white/60 !text-[var(--ink)] !border-[var(--ink)]/20"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label !text-[var(--ink-soft)]">Grupa</label>
                  <select
                    className="select !bg-white/60 !text-[var(--ink)] !border-[var(--ink)]/20"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
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
                <label className="label !text-[var(--ink-soft)]">Opis</label>
                <textarea
                  className="textarea !bg-white/60 !text-[var(--ink)] !border-[var(--ink)]/20"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <div className="flex gap-3">
                <button
                  className="btn btn-outline !text-[var(--ink)] !border-[var(--ink)]/30"
                  onClick={() => {
                    setEditing(false);
                    setTitle(book.title);
                    setAuthor(book.author ?? "");
                    setDescription(book.description ?? "");
                    setGroupId(book.groupId ?? "");
                  }}
                >
                  Anuluj
                </button>
                <button className="btn btn-brass" disabled={saving} onClick={saveChanges}>
                  {saving ? "Zapisywanie…" : "Zapisz zmiany"}
                </button>
              </div>
            </div>
          )}

          {!editing && book.description && (
            <p className="leading-relaxed opacity-90 whitespace-pre-wrap">{book.description}</p>
          )}

          <div className="pt-4 border-t border-[var(--ink)]/10">
            <h2 className="font-display text-lg font-semibold mb-3">Podgląd</h2>
            <iframe
              src={`/api/books/${id}/file`}
              className="w-full h-[75vh] rounded-md border border-[var(--ink)]/15 bg-white"
              title={book.title}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
