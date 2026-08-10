"use client";

import { useEffect, useRef, useState } from "react";
import type { Brain } from "@/lib/types";

const CANVAS_SIZE = 320;
const COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#c0392b",
  "#e67e22",
  "#f1c40f",
  "#1e8449",
  "#16a085",
  "#2563eb",
  "#6c3fc5",
  "#d63384",
  "#7a4f2c",
  "#8a8a8a",
];
const MAX_HISTORY = 25;

// Rather than hand-approximating a brain drawing, use the actual 🧠 emoji
// as the guide — every OS/browser ships a proper full-color brain
// illustration for it, so this is both simpler and truer to the reference
// than any hand-drawn path could be.
function drawGuide(ctx: CanvasRenderingContext2D) {
  const S = CANVAS_SIZE;
  // Left transparent (no fill) so both the editor and the saved PNG show
  // just the brain — no white card behind it.
  ctx.clearRect(0, 0, S, S);

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.font = `${Math.round(S * 0.72)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🧠", S / 2, S / 2 + S * 0.03);
  ctx.restore();
}

export default function DrawBrainModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (brain: Brain) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(4);
  const [name, setName] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) drawGuide(ctx);
  }, []);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }

  function pushHistory(ctx: CanvasRenderingContext2D) {
    history.current.push(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    if (history.current.length > MAX_HISTORY) history.current.shift();
    setCanUndo(history.current.length > 0);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    pushHistory(ctx);
    drawing.current = true;
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawing.current = false;
  }

  function handleUndo() {
    const ctx = canvasRef.current?.getContext("2d");
    const last = history.current.pop();
    if (ctx && last) ctx.putImageData(last, 0, 0);
    setCanUndo(history.current.length > 0);
  }

  function handleClear() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    pushHistory(ctx);
    drawGuide(ctx);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError(null);
    try {
      const image = canvas.toDataURL("image/png");
      const res = await fetch("/api/brains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać rysunku.");
      onCreated(data as Brain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => !saving && e.target === e.currentTarget && onClose()}>
      <div className="modal-panel !max-w-sm">
        <h2 className="font-display text-2xl font-bold mb-1 text-[var(--brass-light)]">
          Narysuj swój mózg
        </h2>
        <p className="text-xs text-[var(--parchment-dark)] opacity-80 mb-4">
          Twój rysunek dołączy do latającej galerii, widocznej dla wszystkich.
        </p>

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-md border border-[rgba(201,163,92,0.35)] touch-none w-full"
          style={{ aspectRatio: "1 / 1", cursor: "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Kolor ${c}`}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2"
              style={{
                background: c,
                borderColor: c === color ? "var(--brass-light)" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
          <label
            className="w-6 h-6 rounded-full border-2 border-[rgba(255,255,255,0.2)] cursor-pointer overflow-hidden relative shrink-0"
            style={{
              background:
                "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            }}
            title="Wybierz dowolny kolor"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              className="btn btn-outline !py-1.5 !px-3 text-xs"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              Cofnij
            </button>
            <button type="button" className="btn btn-outline !py-1.5 !px-3 text-xs" onClick={handleClear}>
              Wyczyść
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <label className="label !mb-0 shrink-0">Grubość</label>
          <input
            type="range"
            min={1}
            max={20}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="flex-1"
          />
          <span
            aria-hidden
            className="shrink-0 rounded-full"
            style={{
              width: `${Math.max(lineWidth, 3)}px`,
              height: `${Math.max(lineWidth, 3)}px`,
              background: color,
            }}
          />
          <span className="text-xs text-[var(--parchment-dark)] w-6 text-right">{lineWidth}</span>
        </div>

        <div className="mt-3">
          <label className="label">Podpis (opcjonalnie)</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Twoje imię"
            maxLength={60}
          />
        </div>

        {error && <p className="text-sm text-red-300 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Anuluj
          </button>
          <button type="button" className="btn btn-brass" onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie…" : "Wypuść w świat"}
          </button>
        </div>
      </div>
    </div>
  );
}
