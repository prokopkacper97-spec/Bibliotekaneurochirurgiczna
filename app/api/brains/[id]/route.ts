import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.brain.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Nie znaleziono rysunku." }, { status: 404 });
  }
  await storage.deleteBrain(id);
  return NextResponse.json({ ok: true });
}
