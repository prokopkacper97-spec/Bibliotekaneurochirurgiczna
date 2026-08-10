"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Book, Group } from "@/lib/types";
import BookCard from "@/app/components/BookCard";
import AddBookModal from "@/app/components/AddBookModal";
import GroupManagerModal from "@/app/components/GroupManagerModal";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [booksRes, groupsRes] = await Promise.all([fetch("/api/books"), fetch("/api/groups")]);
    setBooks(await booksRes.json());
    setGroups(await groupsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    // Initial fetch on mount; loadAll() is also reused after group/book mutations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) || (b.author ?? "").toLowerCase().includes(q)
    );
  }, [books, query]);

  const shelves = useMemo(() => {
    const byGroup = new Map<string, Book[]>();
    for (const b of filteredBooks) {
      const key = b.groupId ?? "__none__";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(b);
    }
    const sections: { id: string; name: string; books: Book[] }[] = groups.map((g) => ({
      id: g.id,
      name: g.name,
      books: byGroup.get(g.id) ?? [],
    }));
    const ungrouped = byGroup.get("__none__") ?? [];
    if (ungrouped.length > 0) {
      sections.push({ id: "__none__", name: "Bez grupy", books: ungrouped });
    }
    return sections.filter((s) => s.books.length > 0 || !query);
  }, [filteredBooks, groups, query]);

  const totalBooks = books.length;

  return (
    <div className="library-shell flex-1 flex flex-col">
      <header className="library-header sticky top-0 z-10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[var(--brass-light)] tracking-tight">
              Biblioteka Neurochirurgiczna
            </h1>
            <p className="text-sm text-[var(--parchment-dark)] mt-1">
              {totalBooks} {totalBooks === 1 ? "pozycja" : "pozycji"} w zbiorze
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              className="input !w-64"
              placeholder="Szukaj tytułu lub autora…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Link href="/mozgi" className="btn btn-outline">
              🧠 Galeria mózgów
            </Link>
            <button className="btn btn-outline" onClick={() => setShowGroupModal(true)}>
              Zarządzaj grupami
            </button>
            <button className="btn btn-brass" onClick={() => setShowAddModal(true)}>
              + Dodaj książkę
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-12">
        {loading && <p className="text-[var(--parchment-dark)]">Ładowanie biblioteki…</p>}

        {!loading && totalBooks === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-[var(--brass-light)] mb-2">
              Półki są jeszcze puste
            </p>
            <p className="text-[var(--parchment-dark)] mb-6">
              Dodaj pierwszy podręcznik, aby zacząć budować bibliotekę.
            </p>
            <button className="btn btn-brass" onClick={() => setShowAddModal(true)}>
              + Dodaj książkę
            </button>
          </div>
        )}

        {!loading && totalBooks > 0 && shelves.every((s) => s.books.length === 0) && (
          <p className="text-[var(--parchment-dark)] text-center py-16">
            Brak wyników dla „{query}”.
          </p>
        )}

        {shelves.map((section) => (
          <section key={section.id} className="shelf-section">
            <span className="shelf-label font-display">{section.name}</span>
            <div className="book-row">
              {section.books.length > 0 ? (
                section.books.map((b) => <BookCard key={b.id} book={b} />)
              ) : (
                <p className="text-sm text-[var(--parchment-dark)] opacity-60 pb-4">
                  Ta grupa jest jeszcze pusta.
                </p>
              )}
            </div>
            <div className="shelf-plank" />
          </section>
        ))}
      </main>

      {showAddModal && (
        <AddBookModal
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onCreated={(book) => {
            setBooks((prev) => [...prev, book]);
          }}
        />
      )}

      {showGroupModal && (
        <GroupManagerModal
          groups={groups}
          onClose={() => setShowGroupModal(false)}
          onChanged={loadAll}
        />
      )}
    </div>
  );
}
