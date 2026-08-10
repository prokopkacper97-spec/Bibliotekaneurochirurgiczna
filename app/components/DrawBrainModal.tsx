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

type Arc = [number, number, number, number, number]; // cx, cy, r, startAngle, endAngle
type Coil = { cx: number; cy: number; r0: number; r1: number; turns: number; a: number };

function spiralPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  turns: number,
  startAngle: number
) {
  let a = startAngle;
  let r = r0;
  ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  for (let t = 0; t <= 1; t += 0.015) {
    a = startAngle + t * Math.PI * 2 * turns;
    r = r0 + t * (r1 - r0);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

// Rounded lobes chained around the top/back of the silhouette (profile
// view, facing left) — the sharp chevron at the front and the underside
// curve back to the temporal notch are drawn separately, around this.
const OUTLINE: Arc[] = [
  [-0.2, -0.62, 0.32, Math.PI * 1.2, Math.PI * 1.95],
  [0.35, -0.66, 0.34, Math.PI * 1.2, Math.PI * 2.02],
  [0.82, -0.3, 0.3, Math.PI * 1.3, Math.PI * 0.2],
  [0.9, 0.22, 0.28, Math.PI * 1.85, Math.PI * 0.55],
];

// Paisley-style coil marks scattered through the interior.
const COILS: Coil[] = [
  { cx: -0.32, cy: -0.3, r0: 0.02, r1: 0.15, turns: 1.3, a: 0.4 },
  { cx: 0.02, cy: -0.42, r0: 0.02, r1: 0.13, turns: 1.2, a: 1.2 },
  { cx: 0.36, cy: -0.34, r0: 0.02, r1: 0.14, turns: 1.3, a: 2.0 },
  { cx: 0.62, cy: -0.08, r0: 0.02, r1: 0.13, turns: 1.2, a: 0.8 },
  { cx: 0.1, cy: -0.08, r0: 0.02, r1: 0.12, turns: 1.1, a: 2.6 },
  { cx: 0.42, cy: 0.16, r0: 0.02, r1: 0.12, turns: 1.1, a: 1.6 },
  { cx: -0.02, cy: 0.18, r0: 0.02, r1: 0.11, turns: 1.0, a: 3.2 },
];

function drawGuide(ctx: CanvasRenderingContext2D) {
  const S = CANVAS_SIZE;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, 0, S, S);

  ctx.save();
  ctx.strokeStyle = "#3a2f1e";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.6;

  const ox = S * 0.46;
  const oy = S * 0.46;
  const scale = S * 0.36;

  // Outer silhouette: sharp frontal chevron, rounded lobes across the top
  // and back, then a simple curve along the underside to the temporal notch.
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ox - 0.98 * scale, oy - 0.1 * scale);
  ctx.lineTo(ox - 0.8 * scale, oy - 0.32 * scale);
  ctx.lineTo(ox - 0.66 * scale, oy - 0.14 * scale);
  ctx.lineTo(ox - 0.52 * scale, oy - 0.36 * scale);
  OUTLINE.forEach(([cx, cy, r, a0, a1]) => {
    ctx.arc(ox + cx * scale, oy + cy * scale, r * scale, a0, a1);
  });
  ctx.quadraticCurveTo(ox + 0.5 * scale, oy + 0.58 * scale, ox + 0.2 * scale, oy + 0.5 * scale);
  ctx.quadraticCurveTo(ox - 0.05 * scale, oy + 0.44 * scale, ox - 0.18 * scale, oy + 0.52 * scale);
  ctx.quadraticCurveTo(ox - 0.32 * scale, oy + 0.6 * scale, ox - 0.46 * scale, oy + 0.44 * scale);
  ctx.stroke();

  // Cerebellum: a small bump tucked under the back, with diagonal hatching.
  const cbx = ox + 0.78 * scale;
  const cby = oy + 0.5 * scale;
  const cbr = 0.15 * scale;
  ctx.beginPath();
  ctx.arc(cbx, cby, cbr, 0, Math.PI * 1.5);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cbx - cbr * 0.6 + i * cbr * 0.35, cby - cbr * 0.55);
    ctx.lineTo(cbx - cbr * 0.6 + i * cbr * 0.35 + cbr * 0.35, cby + cbr * 0.55);
    ctx.stroke();
  }

  // Temporal lobe: the largest, signature spiral.
  ctx.lineWidth = 6;
  ctx.beginPath();
  spiralPath(ctx, ox - 0.28 * scale, oy + 0.3 * scale, 0.03 * scale, 0.22 * scale, 1.7, Math.PI * 0.2);
  ctx.stroke();

  // Interior paisley coils, matching the outline's stroke weight.
  ctx.lineWidth = 5;
  for (const c of COILS) {
    ctx.beginPath();
    spiralPath(ctx, ox + c.cx * scale, oy + c.cy * scale, c.r0 * scale, c.r1 * scale, c.turns, c.a);
    ctx.stroke();
  }

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
