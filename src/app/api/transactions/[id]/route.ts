import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { amount, type, paymentMethod, bankAccountId, notes, currencyId } = body;

  // Load original transaction
  const original = await prisma.transaction.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const validTypes = ["BUY_IN", "CASH_OUT", "DEPOSIT", "WITHDRAWAL", "RAKEBACK_PAYOUT"];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const newAmount = amount ?? original.amount;
  const newType = type ?? original.type;
  const newPaymentMethod = paymentMethod ?? original.paymentMethod ?? "CASH";

  if (newAmount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  if (newPaymentMethod === "BANK" && !bankAccountId && !original.bankAccountId) {
    return NextResponse.json({ error: "Bank account required for bank payments" }, { status: 400 });
  }

  const newBankAccountId = newPaymentMethod === "BANK"
    ? (bankAccountId ?? original.bankAccountId)
    : null;

  // Resolve currency and exchange rate
  let currencyCode = "GEL";
  let exchangeRate = 1;
  let resolvedCurrencyId: string | null = null;

  // currencyId === null means explicitly GEL; undefined means keep original
  if (currencyId === null) {
    // Explicitly set to GEL
    currencyCode = "GEL";
    exchangeRate = 1;
    resolvedCurrencyId = null;
  } else if (currencyId) {
    const curr = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!curr || !curr.active) {
      return NextResponse.json({ error: "Invalid or inactive currency" }, { status: 400 });
    }
    currencyCode = curr.code;
    exchangeRate = curr.exchangeRate;
    resolvedCurrencyId = curr.id;
  } else {
    // Keep original
    currencyCode = original.currencyCode;
    exchangeRate = original.exchangeRate;
    resolvedCurrencyId = original.currencyId;
  }

  const amountInGel = newAmount * exchangeRate;

  // Balance check for outgoing transactions (excluding original tx)
  if (newType === "CASH_OUT" || newType === "WITHDRAWAL" || newType === "RAKEBACK_PAYOUT") {
    const txDate = new Date(original.createdAt);
    const dayStr = txDate.toISOString().split("T")[0];
    const dayStart = new Date(dayStr + "T00:00:00.000Z");
    const dayEnd = new Date(dayStr + "T23:59:59.999Z");

    let channel: string;
    let channelName: string;

    if (newType === "WITHDRAWAL") {
      channel = "DEPOSITS";
      channelName = "Deposits";
    } else if (newPaymentMethod === "BANK" && newBankAccountId) {
      channel = newBankAccountId;
      const ba = await prisma.bankAccount.findUnique({ where: { id: newBankAccountId } });
      channelName = ba?.name || "Bank";
    } else {
      channel = "CASH";
      channelName = "Cash";
    }

    // Get opening balance for this channel
    const opening = await prisma.openingBalance.findUnique({
      where: { date_channel: { date: dayStart, channel } },
    });
    const openingAmount = opening?.amount || 0;

    // Calculate today's in/out for this channel, EXCLUDING the original transaction
    const todayTxs = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        id: { not: id },
      },
      select: { type: true, amount: true, amountInGel: true, paymentMethod: true, bankAccountId: true },
    });

    let totalIn = 0;
    let totalOut = 0;

    for (const t of todayTxs) {
      const gelAmount = t.amountInGel ?? t.amount;
      if (channel === "CASH") {
        if (t.type === "BUY_IN" && t.paymentMethod !== "BANK") totalIn += gelAmount;
        if ((t.type === "CASH_OUT" || t.type === "RAKEBACK_PAYOUT") && t.paymentMethod !== "BANK") totalOut += gelAmount;
      } else if (channel === "DEPOSITS") {
        if (t.type === "DEPOSIT") totalIn += gelAmount;
        if (t.type === "WITHDRAWAL") totalOut += gelAmount;
      } else {
        if (t.type === "BUY_IN" && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalIn += gelAmount;
        if ((t.type === "CASH_OUT" || t.type === "RAKEBACK_PAYOUT") && t.paymentMethod === "BANK" && t.bankAccountId === channel) totalOut += gelAmount;
      }
    }

    const available = openingAmount + totalIn - totalOut;
    if (available < amountInGel) {
      return NextResponse.json(
        { error: `Insufficient funds in ${channelName}. Available: GEL ${available.toFixed(2)}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      type: newType as "BUY_IN" | "CASH_OUT" | "DEPOSIT" | "WITHDRAWAL" | "RAKEBACK_PAYOUT",
      amount: newAmount,
      amountInGel,
      currencyId: resolvedCurrencyId,
      currencyCode,
      exchangeRate,
      paymentMethod: newPaymentMethod === "BANK" ? "BANK" : "CASH",
      bankAccountId: newBankAccountId,
      notes: notes !== undefined ? (notes || null) : original.notes,
    },
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(updated);
}
