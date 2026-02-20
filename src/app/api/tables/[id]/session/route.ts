import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

// Open a table session
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  const { dealerId } = await req.json();

  // Close any existing open session
  await prisma.tableSession.updateMany({
    where: { tableId: id, endedAt: null },
    data: { endedAt: new Date() },
  });

  // Open table
  await prisma.table.update({ where: { id }, data: { status: "OPEN" } });

  const session = await prisma.tableSession.create({
    data: { tableId: id, dealerId: dealerId || null },
  });

  return NextResponse.json(session, { status: 201 });
}

// Close session
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;

  // Close all active sessions
  await prisma.tableSession.updateMany({
    where: { tableId: id, endedAt: null },
    data: { endedAt: new Date() },
  });

  // Unseat all players
  const activeSessions = await prisma.tableSession.findMany({
    where: { tableId: id },
    orderBy: { startedAt: "desc" },
    take: 1,
  });
  if (activeSessions.length > 0) {
    await prisma.tableSeat.updateMany({
      where: { tableSessionId: activeSessions[0].id, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  await prisma.table.update({ where: { id }, data: { status: "CLOSED" } });

  return NextResponse.json({ ok: true });
}
