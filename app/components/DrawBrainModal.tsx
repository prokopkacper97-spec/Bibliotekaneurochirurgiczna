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

type Point = [number, number];

// Smooth open curve through a set of points, using each point as a curve
// control point and the midpoints between neighbors as on-curve anchors —
// the standard trick for turning a rough polygon into an organic blob line.
function smoothOpen(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const mid: Point = [(points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2];
    ctx.quadraticCurveTo(points[i][0], points[i][1], mid[0], mid[1]);
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  ctx.quadraticCurveTo(prev[0], prev[1], last[0], last[1]);
}

function smoothClosed(ctx: CanvasRenderingContext2D, points: Point[]) {
  const first = points[0];
  const lastP = points[points.length - 1];
  ctx.moveTo((first[0] + lastP[0]) / 2, (first[1] + lastP[1]) / 2);
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const mid: Point = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    ctx.quadraticCurveTo(p1[0], p1[1], mid[0], mid[1]);
  }
}

// One hemisphere's outer edge (top view), normalized to a unit radius:
// pronounced, irregular lobes read as "brain" far better than a smooth
// oval does — real gyri are lumpy and asymmetric, not a neat sine wave.
const HEMISPHERE: Point[] = [
  [0.05, -1.0],
  [0.42, -0.88],
  [0.32, -0.62],
  [0.68, -0.58],
  [0.58, -0.28],
  [0.98, -0.22],
  [0.8, 0.08],
  [1.0, 0.32],
  [0.68, 0.42],
  [0.72, 0.68],
  [0.38, 0.62],
  [0.3, 0.92],
  [0.08, 0.78],
  [0, 1.0],
];

function drawGuide(ctx: CanvasRenderingContext2D) {
  const S = CANVAS_SIZE;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, 0, S, S);

  ctx.save();
  ctx.strokeStyle = "#c2b184";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;

  const cx = S * 0.5;
  const cy = S * 0.46;
  const rx = S * 0.3;
  const ry = S * 0.22;
  const gap = S * 0.012;

  const rightPts = HEMISPHERE.map(([x, y]) => [cx + gap + x * rx, cy + y * ry] as Point);
  const leftPts = HEMISPHERE.map(([x, y]) => [cx - gap - x * rx, cy + y * ry] as Point);

  ctx.beginPath();
  smoothOpen(ctx, rightPts);
  ctx.stroke();

  ctx.beginPath();
  smoothOpen(ctx, leftPts);
  ctx.stroke();

  // Longitudinal fissure down the middle.
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.quadraticCurveTo(cx - S * 0.01, cy, cx, cy + ry);
  ctx.stroke();

  // Gyri: curves roughly parallel to (and inset from) the outer boundary —
  // this reads as brain folds far better than lines radiating from center.
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.6;
  for (const side of [1, -1]) {
    const inner = HEMISPHERE.map(([x, y]) => [cx + side * (gap + x * rx * 0.68), cy + y * ry * 0.68] as Point);
    ctx.beginPath();
    smoothOpen(ctx, inner.slice(1, -1));
    ctx.stroke();

    const inner2 = HEMISPHERE.map(([x, y]) => [cx + side * (gap + x * rx * 0.85), cy + y * ry * 0.85] as Point);
    ctx.beginPath();
    smoothOpen(ctx, inner2.slice(2, 8));
    ctx.stroke();
  }

  // Cerebellum: a smaller bumpy blob tucked under the main mass.
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.2;
  const bcx = cx;
  const bcy = cy + ry * 0.88;
  const brx = S * 0.16;
  const bry = S * 0.08;
  const cerebellumPts: Point[] = [];
  const bumps = 10;
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const wob = 1 + 0.14 * Math.sin(a * 3.5 + 0.5);
    cerebellumPts.push([bcx + Math.cos(a) * brx * wob, bcy + Math.sin(a) * bry * wob * 0.7]);
  }
  ctx.beginPath();
  smoothClosed(ctx, cerebellumPts);
  ctx.closePath();
  ctx.stroke();

  // Brainstem.
  ctx.beginPath();
  ctx.moveTo(bcx - S * 0.015, bcy + bry * 0.5);
  ctx.quadraticCurveTo(bcx, bcy + S * 0.1, bcx + S * 0.02, bcy + S * 0.14);
  ctx.lineTo(bcx + S * 0.065, bcy + S * 0.135);
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
