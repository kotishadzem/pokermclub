import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "REGISTRATOR"]);
  if (error) return error;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const visits = await prisma.roomVisit.findMany({
    where: { checkedIn: { gte: todayStart } },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, photo: true } },
      user: { select: { name: true } },
    },
    orderBy: { checkedIn: "desc" },
  });

  const inRoom = visits.filter((v) => !v.checkedOut).length;

  return NextResponse.json({ inRoom, visits });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "REGISTRATOR"]);
  if (error) return error;

  const { playerId, checkedIn } = await req.json();
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  // Check if player is already checked in (no checkout)
  const existing = await prisma.roomVisit.findFirst({
    where: { playerId, checkedOut: null },
  });
  if (existing) {
    return NextResponse.json({ error: "Player is already checked in" }, { status: 400 });
  }

  const visit = await prisma.roomVisit.create({
    data: {
      playerId,
      userId: (session!.user as { id: string }).id,
      ...(checkedIn ? { checkedIn: new Date(checkedIn) } : {}),
    },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, photo: true } },
      user: { select: { name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(visit, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "REGISTRATOR"]);
  if (error) return error;

  const { visitId, checkedOut } = await req.json();
  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  const visit = await prisma.roomVisit.update({
    where: { id: visitId },
    data: { checkedOut: checkedOut ? new Date(checkedOut) : new Date() },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, photo: true } },
      user: { select: { name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(visit);
}
