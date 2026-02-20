import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

// Seat a player
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  const { playerId, seatNumber, buyInAmount } = await req.json();

  // Find active session
  const session = await prisma.tableSession.findFirst({
    where: { tableId: id, endedAt: null },
  });

  if (!session) return NextResponse.json({ error: "Table has no active session" }, { status: 400 });

  // Check seat availability
  const existingSeat = await prisma.tableSeat.findFirst({
    where: { tableSessionId: session.id, seatNumber, leftAt: null },
  });
  if (existingSeat) return NextResponse.json({ error: "Seat is occupied" }, { status: 400 });

  const seat = await prisma.tableSeat.create({
    data: {
      tableSessionId: session.id,
      playerId,
      seatNumber,
      buyInAmount: buyInAmount || 0,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });

  bumpVersion();
  return NextResponse.json(seat, { status: 201 });
}

// Remove a player from seat
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  const { seatId } = await req.json();

  await prisma.tableSeat.update({
    where: { id: seatId },
    data: { leftAt: new Date() },
  });

  // Return updated table data
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      sessions: {
        where: { endedAt: null },
        include: { seats: { where: { leftAt: null }, include: { player: true } } },
        take: 1,
      },
    },
  });

  bumpVersion();
  return NextResponse.json(table);
}
