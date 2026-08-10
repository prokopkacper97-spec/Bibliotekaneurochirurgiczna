"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Brain } from "@/lib/types";
import DrawBrainModal from "@/app/components/DrawBrainModal";

function seeded(seed: string, salt: number) {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000;
}

function flightStyle(id: string): React.CSSProperties {
  const top = 5 + seeded(id, 1) * 78;
  const left = 5 + seeded(id, 2) * 84;
  const size = 64 + seeded(id, 3) * 48;
  const duration = 18 + seeded(id, 4) * 22;
  const delay = -seeded(id, 5) * duration;
  const dx1 = (seeded(id, 6) - 0.5) * 160;
  const dy1 = (seeded(id, 7) - 0.5) * 120;
  const dx2 = (seeded(id, 8) - 0.5) * 160;
  const dy2 = (seeded(id, 9) - 0.5) * 120;
  const dx3 = (seeded(id, 10) - 0.5) * 160;
  const dy3 = (seeded(id, 11) - 0.5) * 120;
  const dr1 = (seeded(id, 12) - 0.5) * 30;
  const dr2 = (seeded(id, 13) - 0.5) * 30;
  const dr3 = (seeded(id, 14) - 0.5) * 30;

  return {
    top: `${top}%`,
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    ["--dx1" as string]: `${dx1}px`,
    ["--dy1" as string]: `${dy1}px`,
    ["--dx2" as string]: `${dx2}px`,
    ["--dy2" as string]: `${dy2}px`,
    ["--dx3" as string]: `${dx3}px`,
    ["--dy3" as string]: `${dy3}px`,
    ["--dr1" as string]: `${dr1}deg`,
    ["--dr2" as string]: `${dr2}deg`,
    ["--dr3" as string]: `${dr3}deg`,
  };
}

export default function BrainGalleryPage() {
  const [brains, setBrains] = useState<Brain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraw, setShowDraw] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/brains");
      setBrains(await res.json());
      setLoading(false);
    })();
  }, []);

  const styles = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    for (const b of brains) map.set(b.id, flightStyle(b.id));
    return map;
  }, [brains]);

  return (
    <div className="flex-1 flex flex-col brain-sky">
      <header className="library-header px-6 py-5 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-[var(--brass-light)] hover:underline text-sm">
              ← Powrót do biblioteki
            </Link>
            <h1 className="font-display text-3xl font-extrabold text-[var(--brass-light)] tracking-tight mt-1">
              Galeria mózgów
            </h1>
            <p className="text-sm text-[var(--parchment-dark)] mt-1">
              {loading ? "Ładowanie…" : `${brains.length} ${brains.length === 1 ? "mózg lata" : "mózgów lata"} w powietrzu`}
            </p>
          </div>
          <button className="btn btn-brass" onClick={() => setShowDraw(true)}>
            🧠 Narysuj swój mózg
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {!loading && brains.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#5a6b8c] text-lg font-display">
              Niebo jest jeszcze puste — narysuj pierwszy mózg!
            </p>
          </div>
        )}
        {brains.map((b) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={b.id}
            src={`/api/brains/${b.id}/image`}
            alt="Narysowany mózg"
            className="flying-brain"
            style={styles.get(b.id)}
          />
        ))}
      </main>

      {showDraw && (
        <DrawBrainModal
          onClose={() => setShowDraw(false)}
          onCreated={(brain) => {
            setBrains((prev) => [brain, ...prev]);
            setShowDraw(false);
          }}
        />
      )}
    </div>
  );
}
