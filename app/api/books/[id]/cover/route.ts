import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await storage.readCover(id);
  if (!data) {
    return NextResponse.json({ error: "Brak okładki." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }

  const form = await req.formData();
  const cover = form.get("cover");
  if (!(cover instanceof File) || !cover.type.startsWith("image/")) {
    return NextResponse.json({ error: "Wymagany jest plik obrazu." }, { status: 400 });
  }

  await storage.saveCover(id, Buffer.from(await cover.arrayBuffer()));
  await prisma.book.update({ where: { id }, data: { hasCustomCover: true } });

  return NextResponse.json({ ok: true });
}
