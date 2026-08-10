import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id }, include: { group: true } });
  if (!book) {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }
  return NextResponse.json(book);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: {
    title?: string;
    author?: string | null;
    description?: string | null;
    groupId?: string | null;
  } = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Tytuł nie może być pusty." }, { status: 400 });
    }
    data.title = title;
  }
  if (typeof body.author === "string") {
    data.author = body.author.trim() || null;
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }
  if ("groupId" in body) {
    const groupId = body.groupId ? String(body.groupId) : null;
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        return NextResponse.json({ error: "Wybrana grupa nie istnieje." }, { status: 400 });
      }
    }
    data.groupId = groupId;
  }

  try {
    const book = await prisma.book.update({ where: { id }, data, include: { group: true } });
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.book.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Nie znaleziono książki." }, { status: 404 });
  }
  await storage.deletePdf(id);
  await storage.deleteCover(id);
  return NextResponse.json({ ok: true });
}
