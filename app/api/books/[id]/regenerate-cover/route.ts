import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { renderFirstPageToPng } from "@/lib/pdfCover";

/**
 * Re-runs auto cover generation for an existing book. Useful after
 * changing the renderer, or retrying a cover that failed the first time.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await storage.readPdf(id);
  } catch {
    return NextResponse.json({ error: "Nie znaleziono pliku PDF." }, { status: 404 });
  }

  const png = await renderFirstPageToPng(pdfBuffer);
  await storage.saveCover(id, png);
  await prisma.book.update({ where: { id }, data: { hasCustomCover: false } });

  return NextResponse.json({ ok: true });
}
