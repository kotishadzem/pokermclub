import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { expenseTypeId, amount, paymentMethod, bankAccountId, notes, chipBreakdown } = body;

  const original = await prisma.expense.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const currentUserId = (session!.user as { id: string }).id;
  if (original.userId !== currentUserId) {
    return NextResponse.json({ error: "You can only edit your own records" }, { status: 403 });
  }

  const newAmount = amount ?? original.amount;
  const newPaymentMethod = paymentMethod ?? original.paymentMethod ?? "CASH";
  const newExpenseTypeId = expenseTypeId ?? original.expenseTypeId;

  if (newAmount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  if (newPaymentMethod === "BANK" && !bankAccountId && !original.bankAccountId) {
    return NextResponse.json({ error: "Bank account required for bank payments" }, { status: 400 });
  }

  const newBankAccountId = newPaymentMethod === "BANK"
    ? (bankAccountId ?? original.bankAccountId)
    : null;

  // Balance check (excluding original expense)
  const txDate = new Date(original.createdAt);
  const dayStr = txDate.toISOString().split("T")[0];
  const dayStart = new Date(dayStr + "T00:00:00.000Z");
  const dayEnd = new Date(dayStr + "T23:59:59.999Z");

  let channel: string;
  let channelName: string;

  if (newPaymentMethod === "BANK" && newBankAccountId) {
    channel = newBankAccountId;
    const ba = await prisma.bankAccount.findUnique({ where: { id: newBankAccountId } });
    channelName = ba?.name || "Bank";
  } else {
    channel = "CASH";
    channelName = "Cash";
  }

  const opening = await prisma.openingBalance.findUnique({
    where: { date_channel: { date: dayStart, channel } },
  });
  const openingAmount = opening?.amount || 0;

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

  // Expenses excluding current one
  const todayExpenses = await prisma.expense.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd }, id: { not: id } },
    select: { amount: true, paymentMethod: true, bankAccountId: true },
  });

  let expenseOut = 0;
  for (const e of todayExpenses) {
    if (channel === "CASH" && e.paymentMethod !== "BANK") expenseOut += e.amount;
    else if (channel !== "CASH" && e.paymentMethod === "BANK" && e.bankAccountId === channel) expenseOut += e.amount;
  }

  const available = openingAmount + totalIn - totalOut - expenseOut;
  if (available < newAmount) {
    return NextResponse.json(
      { error: `Insufficient funds in ${channelName}. Available: GEL ${available.toFixed(2)}` },
      { status: 400 }
    );
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      expenseTypeId: newExpenseTypeId,
      amount: newAmount,
      paymentMethod: newPaymentMethod === "BANK" ? "BANK" : "CASH",
      bankAccountId: newBankAccountId,
      notes: notes !== undefined ? (notes || null) : original.notes,
      ...(chipBreakdown !== undefined ? { chipBreakdown: chipBreakdown && Array.isArray(chipBreakdown) && chipBreakdown.length > 0 ? chipBreakdown : Prisma.DbNull } : {}),
    },
    include: {
      expenseType: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;

  const original = await prisma.expense.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const currentUserId = (session!.user as { id: string }).id;
  if (original.userId !== currentUserId) {
    return NextResponse.json({ error: "You can only delete your own records" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id } });

  bumpVersion();
  return NextResponse.json({ ok: true });
}
