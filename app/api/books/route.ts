import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { renderFirstPageToJpeg } from "@/lib/pdfCover";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const q = searchParams.get("q")?.trim();

  const books = await prisma.book.findMany({
    where: {
      ...(groupId ? { groupId: groupId === "none" ? null : groupId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { author: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { title: "asc" },
    include: { group: true },
  });
  return NextResponse.json(books);
}

/**
 * Finalizes a book after the browser has already uploaded the PDF (and
 * optional cover) directly to Supabase Storage via a signed URL obtained
 * from /api/books/prepare-upload — the file itself never passes through
 * this Vercel function, which is limited to a 4.5MB request body.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const author = String(body.author ?? "").trim() || null;
  const description = String(body.description ?? "").trim() || null;
  const groupId = String(body.groupId ?? "").trim() || null;
  const fileName = String(body.fileName ?? "").trim() || "dokument.pdf";
  const fileSize = Number.isFinite(body.fileSize) ? Number(body.fileSize) : 0;
  const hasCustomCover = Boolean(body.hasCustomCover);

  if (!id) {
    return NextResponse.json({ error: "Brak identyfikatora przesyłania." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Tytuł jest wymagany." }, { status: 400 });
  }
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Wybrana grupa nie istnieje." }, { status: 400 });
    }
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await storage.readPdf(id);
  } catch {
    return NextResponse.json(
      { error: "Nie znaleziono przesłanego pliku PDF. Spróbuj dodać książkę ponownie." },
      { status: 400 }
    );
  }

  if (!hasCustomCover) {
    try {
      const jpeg = await renderFirstPageToJpeg(pdfBuffer);
      await storage.saveCover(id, jpeg);
    } catch (err) {
      // No cover could be generated; the UI falls back to a placeholder.
      console.error("Cover generation failed for book", id, err);
    }
  }

  const book = await prisma.book.create({
    data: {
      id,
      title,
      author,
      description,
      fileName,
      fileSize,
      hasCustomCover,
      groupId,
    },
    include: { group: true },
  });

  return NextResponse.json(book, { status: 201 });
}
