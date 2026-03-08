import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  const today = dateParam || new Date().toISOString().split("T")[0];
  const dayStart = new Date(today + "T00:00:00.000Z");
  const dayEnd = new Date(today + "T23:59:59.999Z");

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: {
      expenseType: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ date: today, total, expenses });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { expenseTypeId, amount, paymentMethod, bankAccountId, notes } = await req.json();

  if (!expenseTypeId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Expense type and positive amount required" }, { status: 400 });
  }

  const expenseType = await prisma.expenseType.findUnique({ where: { id: expenseTypeId } });
  if (!expenseType || !expenseType.active) {
    return NextResponse.json({ error: "Invalid expense type" }, { status: 400 });
  }

  if (paymentMethod === "BANK" && !bankAccountId) {
    return NextResponse.json({ error: "Bank account required for bank payments" }, { status: 400 });
  }

  // Balance check
  const today = new Date().toISOString().split("T")[0];
  const dayStart = new Date(today + "T00:00:00.000Z");
  const dayEnd = new Date(today + "T23:59:59.999Z");

  let channel: string;
  let channelName: string;

  if (paymentMethod === "BANK" && bankAccountId) {
    channel = bankAccountId;
    const ba = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    channelName = ba?.name || "Bank";
  } else {
    channel = "CASH";
    channelName = "Cash";
  }

  // Get opening balance
  const opening = await prisma.openingBalance.findUnique({
    where: { date_channel: { date: dayStart, channel } },
  });
  const openingAmount = opening?.amount || 0;

  // Calculate today's transactions for this channel
  const todayTxs = await prisma.transaction.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    select: { type: true, amount: true, amountInGel: true, paymentMethod: true, bankAccountId: true },
  });

  let totalIn = 0;
  let totalOut = 0;

  for (const t of todayTxs) {
    const gelAmount = t.amountInGel ?? t.amount;
    if (channel === "CASH") {
      if (t.type === "BUY_IN" && t.paymentMethod !== "BANK") totalIn += gelAmount;
      if ((t.type === "CASH_OUT" || t.type === "RAKEBACK_PAYOUT") && t.paymentMethod !== "BANK") totalOut += gelAmount;
    } else {
      if (t.type === "BUY_IN" && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalIn += gelAmount;
      if ((t.type === "CASH_OUT" || t.type === "RAKEBACK_PAYOUT") && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalOut += gelAmount;
    }
  }

  // Also subtract existing expenses for today on this channel
  const todayExpenses = await prisma.expense.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    select: { amount: true, paymentMethod: true, bankAccountId: true },
  });

  let expenseOut = 0;
  for (const e of todayExpenses) {
    if (channel === "CASH" && e.paymentMethod !== "BANK") expenseOut += e.amount;
    else if (channel !== "CASH" && e.paymentMethod === "BANK" && e.bankAccountId === channel) expenseOut += e.amount;
  }

  const available = openingAmount + totalIn - totalOut - expenseOut;
  if (available < amount) {
    return NextResponse.json(
      { error: `Insufficient funds in ${channelName}. Available: GEL ${available.toFixed(2)}` },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      expenseTypeId,
      amount,
      paymentMethod: paymentMethod === "BANK" ? "BANK" : "CASH",
      bankAccountId: paymentMethod === "BANK" ? bankAccountId : null,
      notes: notes || null,
      userId: (session!.user as { id: string }).id,
    },
    include: {
      expenseType: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(expense, { status: 201 });
}
