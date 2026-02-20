import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requireRole(["DEALER"]);
  if (error) return error;

  const userId = (session!.user as { id: string }).id;

  // Find active session where this dealer is assigned
  const tableSession = await prisma.tableSession.findFirst({
    where: { dealerId: userId, endedAt: null },
    include: {
      table: {
        include: {
          gameType: true,
        },
      },
      seats: {
        where: { leftAt: null },
        include: {
          player: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { seatNumber: "asc" },
      },
      rakeRecords: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!tableSession) {
    return NextResponse.json({ assigned: false, tableSession: null });
  }

  return NextResponse.json({ assigned: true, tableSession });
}
