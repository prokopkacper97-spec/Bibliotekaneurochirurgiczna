import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
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

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const groupId = String(form.get("groupId") ?? "").trim() || null;
  const file = form.get("file");
  const coverFile = form.get("cover");

  if (!title) {
    return NextResponse.json({ error: "Tytuł jest wymagany." }, { status: 400 });
  }
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Wymagany jest plik PDF." }, { status: 400 });
  }
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Wybrana grupa nie istnieje." }, { status: 400 });
    }
  }

  const id = nanoid();
  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  await storage.savePdf(id, pdfBuffer);

  let hasCustomCover = false;
  if (coverFile instanceof File && coverFile.size > 0 && coverFile.type.startsWith("image/")) {
    await storage.saveCover(id, Buffer.from(await coverFile.arrayBuffer()));
    hasCustomCover = true;
  } else {
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
      fileName: file.name,
      fileSize: file.size,
      hasCustomCover,
      groupId,
    },
    include: { group: true },
  });

  return NextResponse.json(book, { status: 201 });
}
