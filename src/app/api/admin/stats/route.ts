import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const today = new Date();
  const dayStart = new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z");
  const dayEnd = new Date(today.toISOString().split("T")[0] + "T23:59:59.999Z");

  const [playerCount, openTableCount, todayRake, activeStaffCount, recentActivity] =
    await Promise.all([
      prisma.player.count(),
      prisma.table.count({ where: { status: "OPEN" } }),
      prisma.rakeRecord.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { rakeAmount: true, tipAmount: true },
      }),
      prisma.user.count({ where: { active: true } }),
      prisma.transaction.findMany({
        include: {
          player: { select: { firstName: true, lastName: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    totalPlayers: playerCount,
    openTables: openTableCount,
    todayRevenue: todayRake._sum.rakeAmount || 0,
    todayTips: todayRake._sum.tipAmount || 0,
    activeStaff: activeStaffCount,
    recentActivity,
  });
}
