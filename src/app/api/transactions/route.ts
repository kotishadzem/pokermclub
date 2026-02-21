import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
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
      bankAccount: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { playerId, type, amount, notes, paymentMethod, bankAccountId } = await req.json();
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

  if (paymentMethod === "BANK" && !bankAccountId) {
    return NextResponse.json({ error: "Bank account required for bank payments" }, { status: 400 });
  }

  // Balance check for outgoing transactions
  if (type === "CASH_OUT" || type === "WITHDRAWAL") {
    const today = new Date().toISOString().split("T")[0];
    const dayStart = new Date(today + "T00:00:00.000Z");
    const dayEnd = new Date(today + "T23:59:59.999Z");

    let channel: string;
    let channelName: string;

    if (type === "WITHDRAWAL") {
      channel = "DEPOSITS";
      channelName = "Deposits";
    } else if (paymentMethod === "BANK" && bankAccountId) {
      channel = bankAccountId;
      const ba = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      channelName = ba?.name || "Bank";
    } else {
      channel = "CASH";
      channelName = "Cash";
    }

    // Get opening balance for this channel today
    const opening = await prisma.openingBalance.findUnique({
      where: { date_channel: { date: dayStart, channel } },
    });
    const openingAmount = opening?.amount || 0;

    // Calculate today's in/out for this channel
    const todayTxs = await prisma.transaction.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      select: { type: true, amount: true, paymentMethod: true, bankAccountId: true },
    });

    let totalIn = 0;
    let totalOut = 0;

    for (const t of todayTxs) {
      if (channel === "CASH") {
        if (t.type === "BUY_IN" && t.paymentMethod !== "BANK") totalIn += t.amount;
        if (t.type === "CASH_OUT" && t.paymentMethod !== "BANK") totalOut += t.amount;
      } else if (channel === "DEPOSITS") {
        if (t.type === "DEPOSIT") totalIn += t.amount;
        if (t.type === "WITHDRAWAL") totalOut += t.amount;
      } else {
        // Bank account channel
        if (t.type === "BUY_IN" && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalIn += t.amount;
        if (t.type === "CASH_OUT" && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalOut += t.amount;
      }
    }

    const available = openingAmount + totalIn - totalOut;
    if (available < amount) {
      return NextResponse.json(
        { error: `Insufficient funds in ${channelName}. Available: $${available.toFixed(2)}` },
        { status: 400 }
      );
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      playerId,
      type,
      amount,
      notes: notes || null,
      paymentMethod: paymentMethod === "BANK" ? "BANK" : "CASH",
      bankAccountId: paymentMethod === "BANK" ? bankAccountId : null,
      userId: (session!.user as { id: string }).id,
    },
    include: {
      player: { select: { firstName: true, lastName: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(transaction, { status: 201 });
}
