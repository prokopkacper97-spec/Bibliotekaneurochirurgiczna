import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }

  let signedUrl: string;
  try {
    signedUrl = await storage.getPdfSignedUrl(id);
  } catch {
    return NextResponse.json({ error: "Plik PDF nie został znaleziony." }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
