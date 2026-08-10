import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { contentDisposition } from "@/lib/contentDisposition";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await storage.readPdf(id);
  } catch {
    return NextResponse.json({ error: "Plik PDF nie został znaleziony." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("inline", `${book.title}.pdf`),
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
