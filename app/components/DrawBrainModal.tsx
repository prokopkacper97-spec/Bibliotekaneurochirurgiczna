"use client";

import { useEffect, useRef, useState } from "react";
import type { Brain } from "@/lib/types";

const CANVAS_SIZE = 320;
const COLORS = ["#1a1a1a", "#c0392b", "#2563eb", "#1e8449", "#e67e22"];

function drawGuide(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.save();
  ctx.strokeStyle = "#d8cba8";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;

  // A loose brain-ish silhouette: two lobes plus a center fissure, just
  // enough of a hint to draw over — not meant to be anatomically precise.
  ctx.beginPath();
  ctx.ellipse(CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.52, CANVAS_SIZE * 0.36, CANVAS_SIZE * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.24);
  ctx.quadraticCurveTo(CANVAS_SIZE * 0.46, CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.8);
  ctx.stroke();

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
  const [color, setColor] = useState(COLORS[0]);
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

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
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

  function handleClear() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawGuide(ctx);
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
        body: JSON.stringify({ image }),
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

        <div className="flex items-center gap-2 mt-3">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Kolor ${c}`}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2"
              style={{
                background: c,
                borderColor: c === color ? "var(--brass-light)" : "transparent",
              }}
            />
          ))}
          <button type="button" className="btn btn-outline !py-1.5 !px-3 text-xs ml-auto" onClick={handleClear}>
            Wyczyść
          </button>
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
