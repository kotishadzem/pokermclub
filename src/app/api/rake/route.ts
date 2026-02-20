import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "DEALER"]);
  if (error) return error;

  const { tableSessionId, potAmount, rakeAmount, playerId } = await req.json();

  if (!tableSessionId || potAmount === undefined || rakeAmount === undefined) {
    return NextResponse.json({ error: "tableSessionId, potAmount, and rakeAmount required" }, { status: 400 });
  }

  const record = await prisma.rakeRecord.create({
    data: {
      tableSessionId,
      potAmount,
      rakeAmount,
      playerId: playerId || null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "DEALER"]);
  if (error) return error;

  const url = new URL(req.url);
  const tableSessionId = url.searchParams.get("tableSessionId");

  if (!tableSessionId) {
    return NextResponse.json({ error: "tableSessionId required" }, { status: 400 });
  }

  const records = await prisma.rakeRecord.findMany({
    where: { tableSessionId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRake = records.reduce((sum, r) => sum + r.rakeAmount, 0);
  const totalPots = records.reduce((sum, r) => sum + r.potAmount, 0);

  return NextResponse.json({ records, totalRake, totalPots });
}
