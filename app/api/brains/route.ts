import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const MAX_BYTES = 3 * 1024 * 1024;

export async function GET() {
  const brains = await prisma.brain.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(brains);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const image = String(body.image ?? "");
  const match = image.match(/^data:image\/png;base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Nieprawidłowy format obrazu." }, { status: 400 });
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Rysunek jest pusty." }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "Rysunek jest za duży." }, { status: 400 });
  }

  const id = nanoid();
  await storage.saveBrain(id, buffer);
  const brain = await prisma.brain.create({ data: { id } });

  return NextResponse.json(brain, { status: 201 });
}
