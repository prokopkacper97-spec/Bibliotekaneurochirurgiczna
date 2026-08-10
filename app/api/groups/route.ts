import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Nazwa grupy jest wymagana." }, { status: 400 });
  }

  const existing = await prisma.group.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Grupa o tej nazwie już istnieje." }, { status: 409 });
  }

  const maxPosition = await prisma.group.aggregate({ _max: { position: true } });
  const group = await prisma.group.create({
    data: { name, position: (maxPosition._max.position ?? -1) + 1 },
  });
  return NextResponse.json(group, { status: 201 });
}
