import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const entries = await prisma.waitingList.findMany({
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      table: { select: { id: true, name: true } },
    },
    orderBy: [{ tableId: "asc" }, { position: "asc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { playerId, tableId } = await req.json();
  if (!playerId) return NextResponse.json({ error: "Player required" }, { status: 400 });

  // Get next position
  const last = await prisma.waitingList.findFirst({
    where: { tableId: tableId || null },
    orderBy: { position: "desc" },
  });
  const position = (last?.position || 0) + 1;

  const entry = await prisma.waitingList.create({
    data: { playerId, tableId: tableId || null, position },
    include: { player: { select: { firstName: true, lastName: true } }, table: { select: { name: true } } },
  });

  bumpVersion();
  return NextResponse.json(entry, { status: 201 });
}
