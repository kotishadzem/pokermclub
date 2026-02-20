import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = parseInt(url.searchParams.get("limit") || "100");

  const where: Record<string, unknown> = {};
  if (playerId) where.playerId = playerId;
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z");
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { playerId, type, amount, notes } = await req.json();
  if (!playerId || !type || amount === undefined) {
    return NextResponse.json({ error: "playerId, type, and amount required" }, { status: 400 });
  }

  const validTypes = ["BUY_IN", "CASH_OUT", "DEPOSIT", "WITHDRAWAL", "RAKEBACK_PAYOUT"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      playerId,
      type,
      amount,
      notes: notes || null,
      userId: (session!.user as { id: string }).id,
    },
    include: {
      player: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
