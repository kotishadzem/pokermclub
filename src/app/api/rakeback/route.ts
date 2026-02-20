import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Calculate rakeback for a player or all players
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");

  if (playerId) {
    // Single player rakeback
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, firstName: true, lastName: true, rakebackPercent: true },
    });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // Total rake contributed by this player (hands they were seated for)
    const rakeRecords = await prisma.rakeRecord.findMany({
      where: { playerId },
    });
    const totalRakeContributed = rakeRecords.reduce((sum, r) => sum + r.rakeAmount, 0);

    // Rakeback earned
    const rakebackEarned = totalRakeContributed * (player.rakebackPercent / 100);

    // Already paid out
    const payouts = await prisma.transaction.findMany({
      where: { playerId, type: "RAKEBACK_PAYOUT" },
    });
    const totalPaidOut = payouts.reduce((sum, t) => sum + t.amount, 0);

    // Balance
    const rakebackBalance = rakebackEarned - totalPaidOut;

    return NextResponse.json({
      player,
      totalRakeContributed,
      rakebackPercent: player.rakebackPercent,
      rakebackEarned,
      totalPaidOut,
      rakebackBalance,
    });
  }

  // All players with rakeback > 0
  const players = await prisma.player.findMany({
    where: { rakebackPercent: { gt: 0 } },
    select: { id: true, firstName: true, lastName: true, rakebackPercent: true },
    orderBy: { firstName: "asc" },
  });

  const results = await Promise.all(players.map(async (player) => {
    const rakeRecords = await prisma.rakeRecord.findMany({
      where: { playerId: player.id },
    });
    const totalRakeContributed = rakeRecords.reduce((sum, r) => sum + r.rakeAmount, 0);
    const rakebackEarned = totalRakeContributed * (player.rakebackPercent / 100);

    const payouts = await prisma.transaction.findMany({
      where: { playerId: player.id, type: "RAKEBACK_PAYOUT" },
    });
    const totalPaidOut = payouts.reduce((sum, t) => sum + t.amount, 0);

    return {
      player,
      totalRakeContributed,
      rakebackEarned,
      totalPaidOut,
      rakebackBalance: rakebackEarned - totalPaidOut,
    };
  }));

  return NextResponse.json(results);
}
