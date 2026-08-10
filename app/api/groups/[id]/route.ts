import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: { name?: string; position?: number } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Nazwa grupy jest wymagana." }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body.position === "number") {
    data.position = body.position;
  }

  try {
    const group = await prisma.group.update({ where: { id }, data });
    return NextResponse.json(group);
  } catch {
    return NextResponse.json({ error: "Nie znaleziono grupy." }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nie znaleziono grupy." }, { status: 404 });
  }
}
