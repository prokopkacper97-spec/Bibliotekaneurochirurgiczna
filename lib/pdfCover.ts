import { createCanvas, DOMMatrix, ImageData } from "canvas";
import path from "path";

// pdfjs-dist's renderer expects a few browser globals to exist.
const g = globalThis as unknown as {
  DOMMatrix?: unknown;
  ImageData?: unknown;
};
g.DOMMatrix ??= DOMMatrix;
g.ImageData ??= ImageData;

const COVER_WIDTH = 480;

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(
    canvasAndContext: { canvas: ReturnType<typeof createCanvas> },
    width: number,
    height: number
  ) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: {
    canvas: ReturnType<typeof createCanvas> | null;
    context: unknown;
  }) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

export async function renderFirstPageToJpeg(pdfData: Buffer): Promise<Buffer> {
  // The legacy Node build works without a DOM/worker environment.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Resolved against the project root rather than require.resolve(), which
  // returns a bundler module id (not a filesystem path) once this file is
  // compiled by Next.js.
  const standardFontDataUrl =
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts") + path.sep;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfData),
    disableWorker: true,
    standardFontDataUrl,
    canvasFactory: new NodeCanvasFactory(),
  } as never);

  try {
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = COVER_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as never,
      viewport,
    }).promise;

    return canvas.toBuffer("image/jpeg", { quality: 0.85 });
  } finally {
    await loadingTask.destroy();
  }
}
