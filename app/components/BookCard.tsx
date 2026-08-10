"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/types";

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(160deg, #7a5230, #4a331d)",
  "linear-gradient(160deg, #4b5a4a, #263028)",
  "linear-gradient(160deg, #5a3a4e, #2c1c26)",
  "linear-gradient(160deg, #3a4d5c, #1e2830)",
  "linear-gradient(160deg, #6b4a2a, #3a2714)",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

export default function BookCard({ book }: { book: Book }) {
  const router = useRouter();
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <button
      className="book-card text-left"
      onClick={() => router.push(`/books/${book.id}`)}
      title={book.title}
    >
      <div className="book-cover">
        {!coverFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/books/${book.id}/cover`}
            alt={`Okładka: ${book.title}`}
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="book-cover-placeholder" style={{ background: gradientFor(book.id) }}>
            <span className="font-display font-bold text-sm leading-snug">{book.title}</span>
            {book.author && <span className="text-xs opacity-80 mt-1">{book.author}</span>}
          </div>
        )}
      </div>
      <div className="book-title-caption">{book.title}</div>
    </button>
  );
}
