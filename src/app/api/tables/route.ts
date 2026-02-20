import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const tables = await prisma.table.findMany({
    include: {
      gameType: true,
      sessions: {
        where: { endedAt: null },
        include: {
          dealer: { select: { id: true, name: true } },
          seats: { where: { leftAt: null }, include: { player: { select: { id: true, firstName: true, lastName: true } } } },
        },
        take: 1,
      },
      waitingList: { orderBy: { position: "asc" }, include: { player: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const body = await req.json();
  const { name, gameTypeId, seats, minBuyIn, maxBuyIn, blindSmall, blindBig, posX, posY } = body;

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const table = await prisma.table.create({
    data: {
      name,
      gameTypeId: gameTypeId || null,
      seats: seats || 9,
      minBuyIn: minBuyIn || 0,
      maxBuyIn: maxBuyIn || 0,
      blindSmall: blindSmall || 0,
      blindBig: blindBig || 0,
      posX: posX || 0,
      posY: posY || 0,
    },
    include: { gameType: true },
  });

  return NextResponse.json(table, { status: 201 });
}
